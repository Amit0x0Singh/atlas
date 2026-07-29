import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import prisma from '../../../db.js';
import { writeAudit } from '../../../middleware/audit.js';
import { RESTORED_UPLOADS_DIR, ensureStorageDirs } from '../utils/storage-paths.js';
import { insertOrderFor, deleteOrderFor, expandForCascades, BIGINT_FIELDS } from '../utils/backup-order.js';
import { MODELS } from '../../admin_panel/get/admin_panel.controller.js';

const KNOWN_MODELS = new Set(Object.values(MODELS).map((m) => m.model));
const CHUNK_SIZE = 500; // stay well under Postgres's 65535-parameter-per-statement limit
const SUPPORTED_VERSION = 1;

class ValidationError extends Error {}

// Every check here runs BEFORE any prisma mutation is attempted — a failure
// at any step means zero writes happened.
export async function validateBackupFile(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    throw new ValidationError('Backup file is missing or empty.');
  }

  let raw;
  try {
    raw = zlib.gunzipSync(fs.readFileSync(filePath));
  } catch {
    throw new ValidationError('File is not a valid gzip archive — only .json.gz backups produced by this system are supported.');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new ValidationError('Decompressed content is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ValidationError('Backup file has no top-level JSON object.');
  }
  if (parsed.version !== SUPPORTED_VERSION) {
    throw new ValidationError(`Unsupported backup format version: ${parsed.version ?? '(missing)'}.`);
  }
  if (!Array.isArray(parsed.tables) || parsed.tables.length === 0) {
    throw new ValidationError('Backup file lists no tables.');
  }
  if (typeof parsed.data !== 'object' || parsed.data === null) {
    throw new ValidationError('Backup file is missing its data section.');
  }

  for (const table of parsed.tables) {
    if (!KNOWN_MODELS.has(table)) {
      throw new ValidationError(`Backup references an unknown table: "${table}".`);
    }
  }
  const dataKeys = Object.keys(parsed.data);
  const tableSet = new Set(parsed.tables);
  if (dataKeys.length !== parsed.tables.length || dataKeys.some((k) => !tableSet.has(k))) {
    throw new ValidationError('Backup file\'s table list and data section do not match.');
  }
  for (const table of parsed.tables) {
    const rows = parsed.data[table];
    if (!Array.isArray(rows)) throw new ValidationError(`Table "${table}" is not an array in the backup file.`);
    if (rows.length > 0 && (typeof rows[0] !== 'object' || rows[0] === null || Array.isArray(rows[0]))) {
      throw new ValidationError(`Table "${table}" contains malformed row data.`);
    }
  }

  // Files predating this field have no "scope" key at all — default to FULL
  // so every existing backup keeps restoring exactly as it always has.
  return { parsed, tables: parsed.tables, scope: parsed.scope ?? 'FULL' };
}

// JSON round-trips BigInt columns as strings (see backup-export.service.js) —
// convert them back before handing rows to Prisma.
function coerceBigInts(table, rows) {
  const fields = BIGINT_FIELDS[table];
  if (!fields?.length) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const f of fields) if (copy[f] != null) copy[f] = BigInt(copy[f]);
    return copy;
  });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function runRestore(restoreJobId, filePath, auditCtx = {}) {
  const restoreJob = await prisma.restoreJob.findUnique({ where: { id: restoreJobId } });
  await prisma.restoreJob.update({ where: { id: restoreJobId }, data: { status: 'VALIDATING' } });

  try {
    await runRestoreInner(restoreJobId, filePath, auditCtx);
  } finally {
    // Only relocate files staged from an upload — a HISTORY-sourced restore's
    // filePath IS the permanent BackupJob file and must stay put so future
    // downloads/restores of that same backup keep working. Runs regardless
    // of whether validation or the restore transaction itself failed.
    if (restoreJob?.sourceType === 'UPLOAD') {
      ensureStorageDirs();
      try {
        if (fs.existsSync(filePath)) {
          const dest = path.join(RESTORED_UPLOADS_DIR, `${restoreJobId}-${path.basename(filePath)}`);
          fs.renameSync(filePath, dest);
        }
      } catch { /* best-effort — restore result already recorded either way */ }
    }
  }
}

async function runRestoreInner(restoreJobId, filePath, auditCtx) {
  let parsed;
  let requestedTables;
  let scope;
  try {
    ({ parsed, tables: requestedTables, scope } = await validateBackupFile(filePath));
  } catch (err) {
    await prisma.restoreJob.update({
      where: { id: restoreJobId },
      data: { status: 'FAILED', errorMessage: err.message },
    });
    await writeAudit({
      ...auditCtx,
      action: 'RESTORE',
      tableName: 'restore_jobs',
      recordId: restoreJobId,
      notes: `Restore FAILED validation: ${err.message}`,
    });
    return;
  }

  // Expand to include cascade-dependents, but only ones the file actually has
  // (an older backup predating this expansion logic shouldn't hard-fail).
  const availableSet = new Set(requestedTables);
  const tables = expandForCascades(requestedTables).filter((t) => availableSet.has(t));
  const insertOrder = insertOrderFor(tables);
  const deleteOrder = deleteOrderFor(tables);

  await prisma.restoreJob.update({
    where: { id: restoreJobId },
    data: { status: 'RESTORING', tables, tablesTotal: tables.length, tablesDone: 0 },
  });

  let recordCount = 0;
  try {
    await prisma.$transaction(
      async (tx) => {
        // FULL backups contain the whole table, so restoring means "make
        // this table exactly match the file" — wipe first. PARTIAL backups
        // (row-scoped, e.g. the Data Management delete pipeline's safeguard
        // backups) contain only specific rows — wiping the table first would
        // destroy every OTHER current row, so skip it entirely; `createMany`
        // with `skipDuplicates` re-inserts just what was removed and leaves
        // everything else untouched.
        if (scope === 'FULL') {
          for (const table of deleteOrder) {
            // eslint-disable-next-line no-await-in-loop
            await tx[table].deleteMany({});
          }
        }
        for (const table of insertOrder) {
          const rows = coerceBigInts(table, parsed.data[table] ?? []);
          for (const batch of chunk(rows, CHUNK_SIZE)) {
            if (batch.length === 0) continue;
            // eslint-disable-next-line no-await-in-loop
            await tx[table].createMany({ data: batch, skipDuplicates: scope !== 'FULL' });
          }
          recordCount += rows.length;
          // Progress is tracked outside the transaction (plain `prisma`, not
          // `tx`) so pollers see it update live instead of only after commit.
          // eslint-disable-next-line no-await-in-loop
          await prisma.restoreJob.update({
            where: { id: restoreJobId },
            data: { tablesDone: { increment: 1 }, currentTable: table, recordCount },
          });
        }
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    await prisma.restoreJob.update({
      where: { id: restoreJobId },
      data: { status: 'COMPLETED', currentTable: null, completedAt: new Date() },
    });

    await writeAudit({
      ...auditCtx,
      action: 'RESTORE',
      tableName: 'restore_jobs',
      recordId: restoreJobId,
      notes: `Restore completed — ${tables.length} table(s), ${recordCount} record(s)`,
    });
  } catch (err) {
    await prisma.restoreJob.update({
      where: { id: restoreJobId },
      data: { status: 'FAILED', errorMessage: err.message },
    });
    await writeAudit({
      ...auditCtx,
      action: 'RESTORE',
      tableName: 'restore_jobs',
      recordId: restoreJobId,
      notes: `Restore FAILED: ${err.message}`,
    });
  }
}
