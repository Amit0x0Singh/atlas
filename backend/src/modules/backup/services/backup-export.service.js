import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import prisma from '../../../db.js';
import { writeAudit } from '../../../middleware/audit.js';
import { BACKUPS_DIR, ensureStorageDirs } from '../utils/storage-paths.js';
import { insertOrderFor } from '../utils/backup-order.js';

const PAGE_SIZE = 1000;

// bigint fields (AuditLog.id etc.) have no native JSON representation —
// stringify them; the restore side coerces back via BIGINT_FIELDS.
function jsonReplacer(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

function writeChunk(stream, chunk) {
  return new Promise((resolve, reject) => {
    const ok = stream.write(chunk);
    if (ok) return resolve();
    stream.once('drain', resolve);
    stream.once('error', reject);
  });
}

// Streams every row of every requested table straight into a gzip'd JSON
// file — never buffers the whole export in memory. Runs fire-and-forget
// after createBackup() has already responded to the HTTP request; progress
// is polled off the BackupJob row this function keeps updating as it goes.
export async function runBackupExport(backupJobId, { tables, auditCtx }) {
  ensureStorageDirs();
  const fileName = `${backupJobId}.json.gz`;
  const filePath = path.join(BACKUPS_DIR, fileName);
  const fileStream = fs.createWriteStream(filePath);
  const gzip = zlib.createGzip();
  gzip.pipe(fileStream);

  const finished = new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
    gzip.on('error', reject);
  });

  const orderedTables = insertOrderFor(tables);
  const tableBreakdown = {};
  let recordCount = 0;

  try {
    await writeChunk(
      gzip,
      `{"version":1,"createdAt":${JSON.stringify(new Date().toISOString())},` +
        `"tables":${JSON.stringify(orderedTables)},"data":{`,
    );

    for (let i = 0; i < orderedTables.length; i++) {
      const table = orderedTables[i];
      await writeChunk(gzip, `${JSON.stringify(table)}:[`);

      let skip = 0;
      let isFirstRow = true;
      let tableRowCount = 0;
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const page = await prisma[table].findMany({ skip, take: PAGE_SIZE });
        if (page.length === 0) break;
        for (const row of page) {
          // eslint-disable-next-line no-await-in-loop
          await writeChunk(gzip, (isFirstRow ? '' : ',') + JSON.stringify(row, jsonReplacer));
          isFirstRow = false;
        }
        tableRowCount += page.length;
        skip += PAGE_SIZE;
        if (page.length < PAGE_SIZE) break;
      }

      await writeChunk(gzip, `]${i < orderedTables.length - 1 ? ',' : ''}`);

      recordCount += tableRowCount;
      tableBreakdown[table] = tableRowCount;

      // eslint-disable-next-line no-await-in-loop
      await prisma.backupJob.update({
        where: { id: backupJobId },
        data: { tablesDone: { increment: 1 }, recordCount, currentTable: table, tableBreakdown },
      });
    }

    await writeChunk(gzip, `},"tableCount":${orderedTables.length},"recordCount":${recordCount}}`);
    gzip.end();
    await finished;

    const { size } = fs.statSync(filePath);
    await prisma.backupJob.update({
      where: { id: backupJobId },
      data: {
        status: 'COMPLETED',
        fileSizeBytes: BigInt(size),
        filePath,
        fileName,
        currentTable: null,
        completedAt: new Date(),
      },
    });

    await writeAudit({
      ...auditCtx,
      action: 'CREATE',
      tableName: 'backup_jobs',
      recordId: backupJobId,
      notes: `Backup completed — ${orderedTables.length} table(s), ${recordCount} record(s)`,
    });
  } catch (err) {
    try { gzip.destroy(); fileStream.destroy(); } catch { /* best-effort */ }
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* best-effort */ }

    await prisma.backupJob
      .update({ where: { id: backupJobId }, data: { status: 'FAILED', errorMessage: err.message } })
      .catch(() => {});

    await writeAudit({
      ...auditCtx,
      action: 'CREATE',
      tableName: 'backup_jobs',
      recordId: backupJobId,
      notes: `Backup FAILED: ${err.message}`,
    });
  }
}
