import fs from 'fs';
import zlib from 'zlib';
import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import prisma from '../../../db.js';
import backendPkg from '../../../../package.json' with { type: 'json' };
import { MODELS } from '../../admin_panel/get/admin_panel.controller.js';
import { excelSafeCell } from '../../../utils/excel-safe-cell.js';

const MODELS_BY_ACCESSOR = new Map(Object.values(MODELS).map((m) => [m.model, m]));

// accessor -> [scalar field names] straight from the Prisma schema — used as
// the header fallback for a table with zero rows, since column keys can't be
// read off the data itself when there isn't any.
const SCHEMA_FIELDS_BY_ACCESSOR = new Map(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name.charAt(0).toLowerCase() + m.name.slice(1),
    m.fields.filter((f) => f.kind === 'scalar').map((f) => f.name),
  ]),
);

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
// Deliberately excludes leading-zero strings (e.g. "007") so zero-padded
// codes/sequence numbers aren't silently corrupted into plain numbers.
const SAFE_NUMERIC_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
const MAX_COL_WIDTH = 60;
const MIN_COL_WIDTH = 10;
const WIDTH_SAMPLE_SIZE = 200; // rows sampled per column for auto-sizing, not the full table

function camelToTitle(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// Excel worksheet names: max 31 chars, and forbidden \ / ? * [ ] : — dedupe
// against collisions that truncation could introduce (none exist today, but
// the model list keeps growing).
function sheetNameFor(table, usedNames) {
  const meta = MODELS_BY_ACCESSOR.get(table);
  let base = (meta?.title ?? table).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  let name = base;
  let i = 2;
  while (usedNames.has(name.toLowerCase())) {
    const suffix = ` (${i})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
    i += 1;
  }
  usedNames.add(name.toLowerCase());
  return name;
}

// { value, numFmt } — coerces ISO datetime strings to real Date cells and
// plain-looking numeric strings (Decimal fields round-trip as strings, see
// backup-export.service.js) to real numbers, so Excel treats them as dates/
// numbers rather than text. Leaves everything else as-is.
function coerceCell(value) {
  if (value === null || value === undefined) return { value: null };
  if (value instanceof Date) return { value, numFmt: 'dd-mmm-yyyy hh:mm' };
  if (typeof value === 'string') {
    if (ISO_DATETIME_RE.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return { value: d, numFmt: 'dd-mmm-yyyy hh:mm' };
    }
    if (SAFE_NUMERIC_RE.test(value)) {
      const n = Number(value);
      if (Number.isFinite(n)) return { value: n };
    }
    return { value: excelSafeCell(value) };
  }
  if (Array.isArray(value) || (typeof value === 'object')) return { value: JSON.stringify(value) };
  return { value };
}

function columnsFor(rows, table) {
  // A zero-row table has no rows to read column names off of — fall back to
  // the Prisma schema so the worksheet still gets real headers instead of
  // being silently blank (caught via testing a MODULE backup over an empty
  // table, e.g. RolePermission).
  const keys = rows.length ? Object.keys(rows[0]) : (SCHEMA_FIELDS_BY_ACCESSOR.get(table) ?? []);
  return keys.map((key) => {
    let width = key.length;
    for (let i = 0; i < Math.min(rows.length, WIDTH_SAMPLE_SIZE); i++) {
      const len = String(rows[i]?.[key] ?? '').length;
      if (len > width) width = len;
    }
    return { header: camelToTitle(key), key, width: Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, width + 2)) };
  });
}

function styleHeaderRow(worksheet) {
  const row = worksheet.getRow(1);
  row.font = { bold: true };
  row.eachCell((cell) => { cell.fill = HEADER_FILL; });
  row.commit();
}

async function getDatabaseVersion() {
  try {
    const rows = await prisma.$queryRaw`SELECT version()`;
    const raw = rows?.[0]?.version ?? '';
    return raw.match(/PostgreSQL [\d.]+/)?.[0] ?? raw.split(',')[0] ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// Streams an .xlsx workbook straight to the HTTP response — never buffers
// the whole workbook in memory, so this stays memory-safe even for a Full
// Database backup's ~85 worksheets. The backup's own decompressed JSON *is*
// read into memory first (same deliberate simplification already accepted
// for restore, see backup-restore.service.js — this system's realistic
// backup sizes don't warrant a streaming JSON reader), but the far larger
// Excel-format output never is.
export async function streamBackupAsExcel(res, backupJob) {
  const raw = zlib.gunzipSync(fs.readFileSync(backupJob.filePath));
  const parsed = JSON.parse(raw.toString('utf8'));
  const dbVersion = await getDatabaseVersion();

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true });

  const info = workbook.addWorksheet('Information');
  info.columns = [{ key: 'label', width: 26 }, { key: 'value', width: 50 }];
  const infoRows = [
    ['Backup Name', backupJob.name],
    ['Backup Type', backupJob.type],
    ['Backup Scope', backupJob.scope || 'FULL'],
    ['Created By', backupJob.createdByName || backupJob.createdBy || '—'],
    ['Created Date & Time', backupJob.createdAt],
    ['Application Version', backendPkg.version],
    ['Database Version', dbVersion],
    ['Number of Tables', parsed.tables.length],
    ['Total Records', parsed.recordCount ?? 0],
    ['Export Date & Time', new Date()],
  ];
  for (const [label, value] of infoRows) {
    const { value: v, numFmt } = coerceCell(value);
    const row = info.addRow({ label, value: v });
    row.getCell(1).font = { bold: true };
    if (numFmt) row.getCell(2).numFmt = numFmt;
  }
  info.commit();

  const usedNames = new Set(['information']);
  for (const table of parsed.tables) {
    const rows = parsed.data[table] ?? [];
    const sheet = workbook.addWorksheet(sheetNameFor(table, usedNames), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = columnsFor(rows, table);
    styleHeaderRow(sheet);
    if (sheet.columns.length) {
      const lastCol = sheet.getColumn(sheet.columns.length).letter;
      sheet.autoFilter = `A1:${lastCol}1`;
    }

    for (const row of rows) {
      const rowValues = {};
      const numFmts = {};
      for (const [key, val] of Object.entries(row)) {
        const { value, numFmt } = coerceCell(val);
        rowValues[key] = value;
        if (numFmt) numFmts[key] = numFmt;
      }
      const addedRow = sheet.addRow(rowValues);
      for (const [key, numFmt] of Object.entries(numFmts)) addedRow.getCell(key).numFmt = numFmt;
      addedRow.commit();
    }
    sheet.commit();
  }

  await workbook.commit();
}
