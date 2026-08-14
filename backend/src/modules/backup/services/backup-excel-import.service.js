// Parses a .xlsx file produced by backup-excel-export.service.js back into
// the exact same { parsed, tables, scope } shape validateBackupFile()
// (backup-restore.service.js) returns for the original .json.gz format, so
// runRestoreInner() needs zero changes to accept either source.
//
// This is inherently a best-effort reconstruction, not a byte-for-byte
// inverse of the export — Excel has no distinct "this is a Decimal" or
// "this is a JSON array" cell type, so values were reformatted for
// readability on the way out (see coerceCell in the export service) and
// have to be re-typed here using the live Prisma schema as the source of
// truth for what each column *should* be. The frontend surfaces a warning
// about this before the user confirms a restore from Excel.

import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { MODELS } from '../../admin_panel/get/admin_panel.controller.js';

class ExcelValidationError extends Error {}

const SUPPORTED_VERSION = 1; // matches backup-restore.service.js's SUPPORTED_VERSION

// accessor -> DMMF model, for per-field type lookups.
const DMMF_BY_ACCESSOR = new Map(
  Prisma.dmmf.datamodel.models.map((m) => [m.name.charAt(0).toLowerCase() + m.name.slice(1), m]),
);

function camelToTitle(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// Mirrors sheetNameFor()'s base-name computation exactly (sanitize +
// truncate to 31 chars), MINUS the collision-suffix step — collisions don't
// exist today (same assumption the export side already makes) and aren't
// worth reproducing here, since the actual on-disk sheet name (including
// any "(2)" suffix) is what we're matching FROM, not generating.
function baseSheetName(meta, accessor) {
  return (meta?.title ?? accessor).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
}

// sanitized/truncated title -> accessor, built from every model the backup
// system knows about (not just tables in this particular file), so any
// subset/order of sheets resolves correctly regardless of which backup
// produced them.
const ACCESSOR_BY_SHEET_NAME = new Map(
  Object.values(MODELS).map((meta) => [baseSheetName(meta, meta.model).toLowerCase(), meta.model]),
);

function resolveAccessorForSheet(sheetName) {
  // Strip a possible " (2)" collision suffix before matching, in case a
  // rare title collision did occur at export time.
  const stripped = sheetName.replace(/\s\(\d+\)$/, '');
  return ACCESSOR_BY_SHEET_NAME.get(sheetName.toLowerCase()) || ACCESSOR_BY_SHEET_NAME.get(stripped.toLowerCase());
}

// Builds header-text -> fieldName for one model, by forward-computing
// camelToTitle() over every real scalar field and matching against it —
// robust against the header transform being lossy to invert blindly, and
// naturally tolerant of the export's column order (or a user reordering
// columns in Excel), since matching is by text, not position.
function fieldMapFor(accessor) {
  const model = DMMF_BY_ACCESSOR.get(accessor);
  if (!model) return new Map();
  return new Map(
    model.fields.filter((f) => f.kind === 'scalar').map((f) => [camelToTitle(f.name), f]),
  );
}

const EXCEL_EPOCH_EMPTY = new Set(['', null, undefined]);

// Coerces one cell's ExcelJS value back to what Prisma expects for `field`,
// using the live schema as ground truth rather than guessing from the
// cell's own JS type alone.
function coerceCellBack(rawValue, field) {
  // ExcelJS represents a cell with a formula/rich-text/hyperlink as an
  // object with a `.result`/`.text` — reduce to a plain scalar first.
  let value = rawValue;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if ('result' in value) value = value.result;
    else if ('text' in value) value = value.text;
    else if ('richText' in value) value = value.richText.map((r) => r.text).join('');
  }

  if (EXCEL_EPOCH_EMPTY.has(value)) return null;

  if (field.type === 'DateTime') {
    if (value instanceof Date) return value.toISOString();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (field.type === 'Boolean') {
    if (typeof value === 'boolean') return value;
    return String(value).trim().toLowerCase() === 'true';
  }
  if (field.type === 'BigInt') {
    // Kept as a numeric string here, matching the on-disk JSON format
    // (backup-export.service.js's jsonReplacer does the same) — the
    // downstream coerceBigInts() shared by both restore paths converts it
    // to a real BigInt right before the Prisma call.
    const n = Number(value);
    return Number.isFinite(n) ? String(Math.trunc(n)) : String(value);
  }
  if (field.type === 'Int') {
    return Math.trunc(Number(value));
  }
  if (field.type === 'Float' || field.type === 'Decimal') {
    // Kept as a string — Prisma's Decimal input accepts strings directly
    // and this avoids reintroducing floating-point error on top of the
    // precision Excel's own display formatting may have already cost.
    // Float fields accept a numeric string equally well.
    return typeof value === 'number' ? String(value) : String(value).trim();
  }
  if (field.type === 'Json' || field.isList) {
    if (typeof value !== 'string') return field.isList ? [] : value;
    try { return JSON.parse(value); } catch { return field.isList ? [] : null; }
  }
  // String (default): the export may have turned a numeric-looking string
  // (e.g. an item code with no leading zero) into a real Excel number —
  // cast back to text so it matches the schema's actual type.
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function parseExcelBackup(filePath) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch {
    throw new ExcelValidationError('File is not a valid .xlsx workbook.');
  }

  const sheets = workbook.worksheets.filter((ws) => ws.name.toLowerCase() !== 'information');
  if (sheets.length === 0) {
    throw new ExcelValidationError('Workbook contains no data sheets.');
  }

  const infoSheet = workbook.getWorksheet('Information');
  let scope = 'FULL';
  if (infoSheet) {
    infoSheet.eachRow((row) => {
      const label = row.getCell(1).value;
      if (typeof label === 'string' && label.trim().toLowerCase() === 'backup scope') {
        const v = String(row.getCell(2).value ?? '').trim().toUpperCase();
        if (v === 'PARTIAL' || v === 'FULL') scope = v;
      }
    });
  }

  const tables = [];
  const data = {};
  let recordCount = 0;

  for (const sheet of sheets) {
    const accessor = resolveAccessorForSheet(sheet.name);
    if (!accessor) {
      throw new ExcelValidationError(`Sheet "${sheet.name}" does not match any known table — this file may not be a backup export from this system.`);
    }
    const fieldMap = fieldMapFor(accessor);

    const headerRow = sheet.getRow(1);
    const columns = []; // { colNumber, field }
    headerRow.eachCell((cell, colNumber) => {
      const headerText = String(cell.value ?? '').trim();
      const field = fieldMap.get(headerText);
      if (field) columns.push({ colNumber, field });
    });
    if (columns.length === 0) {
      throw new ExcelValidationError(`Sheet "${sheet.name}" has no recognizable columns for table "${accessor}".`);
    }

    const rows = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (row.cellCount === 0 || row.actualCellCount === 0) continue; // skip blank trailing rows
      const obj = {};
      for (const { colNumber, field } of columns) {
        obj[field.name] = coerceCellBack(row.getCell(colNumber).value, field);
      }
      rows.push(obj);
    }

    tables.push(accessor);
    data[accessor] = rows;
    recordCount += rows.length;
  }

  const parsed = { version: SUPPORTED_VERSION, scope, createdAt: new Date().toISOString(), tables, data, tableCount: tables.length, recordCount };
  return { parsed, tables, scope };
}

export { ExcelValidationError };
