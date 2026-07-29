import prisma from '../../../db.js';
import { MODELS } from '../../admin_panel/get/admin_panel.controller.js';
import { FK_EDGES, expandForCascades } from '../../backup/utils/backup-order.js';

const MODELS_BY_ACCESSOR = new Map(Object.values(MODELS).map((m) => [m.model, m]));

// parentAccessor -> [edge, ...] pointing AT it — precomputed once so impact
// checks are bounded by the schema's actual (small, fixed) FK-edge count,
// never a scan of all 85 tables.
const REFERRERS_BY_PARENT = new Map();
for (const edge of FK_EDGES) {
  if (!REFERRERS_BY_PARENT.has(edge.parentAccessor)) REFERRERS_BY_PARENT.set(edge.parentAccessor, []);
  REFERRERS_BY_PARENT.get(edge.parentAccessor).push(edge);
}

function pkFieldsFor(table) {
  const meta = MODELS_BY_ACCESSOR.get(table);
  if (!meta) throw new Error(`Unknown table: "${table}"`);
  return Array.isArray(meta.idField) ? meta.idField : [meta.idField];
}

// { in: [...] } for a single-column key, { OR: [{AND:...}] } for composite —
// same shape either way: rows is an array of objects keyed by `fields`.
function whereFromRows(fields, rows) {
  if (fields.length === 1) {
    return { [fields[0]]: { in: rows.map((r) => r[fields[0]]) } };
  }
  return { OR: rows.map((r) => ({ AND: fields.map((f) => ({ [f]: r[f] })) })) };
}

// "Does any row reference something at all" — Prisma rejects `{not: null}`
// on a required (non-nullable) column outright, so only apply it to fields
// that can actually be null. A fully-required FK needs no filter at all:
// every row necessarily has it set, so count() with no where is correct.
function notNullWhere(fields, fieldsNullable) {
  const clauses = fields
    .filter((_, i) => fieldsNullable[i])
    .map((f) => ({ [f]: { not: null } }));
  return clauses.length ? { AND: clauses } : {};
}

// Single source of truth for "what tables does this delete touch, and with
// what row filter" — used by both the read-only preview endpoint and the
// actual delete, so they can never resolve a different scope from the same
// request.
export function resolveDeleteScope({ deleteType, table, ids, modules, tables }) {
  let baseTables;
  if (deleteType === 'RECORD' || deleteType === 'TABLE') {
    if (!table) throw new Error('table is required for RECORD/TABLE deletes.');
    baseTables = [table];
  } else if (deleteType === 'MODULE') {
    if (!modules?.length) throw new Error('modules is required for MODULE deletes.');
    baseTables = Object.values(MODELS).filter((m) => modules.includes(m.group)).map((m) => m.model);
  } else if (deleteType === 'SELECTED') {
    if (!tables?.length) throw new Error('tables is required for SELECTED deletes.');
    baseTables = tables;
  } else {
    throw new Error(`Unknown deleteType: "${deleteType}"`);
  }

  for (const t of baseTables) {
    if (!MODELS_BY_ACCESSOR.has(t)) throw new Error(`Unknown table: "${t}"`);
  }

  const scopeTables = expandForCascades(baseTables);
  const whereByTable = {};

  if (deleteType === 'RECORD') {
    if (!ids?.length) throw new Error('ids is required for RECORD deletes.');
    const pkFields = pkFieldsFor(table);

    // Rows keyed by field name at each table, propagated one cascade-level
    // at a time (this schema only has single-level cascades today — a
    // deeper chain would need another pass here, but none exists yet).
    const rowsByTable = { [table]: ids };
    let frontier = [table];
    while (frontier.length) {
      const next = [];
      for (const parent of frontier) {
        for (const edge of REFERRERS_BY_PARENT.get(parent) ?? []) {
          if (edge.onDelete !== 'Cascade' || rowsByTable[edge.childAccessor]) continue;
          rowsByTable[edge.childAccessor] = rowsByTable[parent].map((row) =>
            Object.fromEntries(edge.fkFields.map((f, i) => [f, row[edge.referencedFields[i]]])),
          );
          next.push(edge.childAccessor);
        }
      }
      frontier = next;
    }

    for (const [t, rows] of Object.entries(rowsByTable)) {
      const fields = t === table ? pkFields : Object.keys(rows[0] ?? {});
      whereByTable[t] = whereFromRows(fields, rows);
    }
  }
  // TABLE / MODULE / SELECTED: no whereByTable entries — whole-table deletes
  // for every table in scopeTables (deleteMany({}), count() with no where).

  return { scopeTables, whereByTable };
}

// Read-only — safe to call repeatedly as the admin adjusts scope in the UI.
export async function computeImpact({ scopeTables, whereByTable }) {
  const scopeSet = new Set(scopeTables);

  const tableBreakdownPreview = {};
  for (const t of scopeTables) {
    // eslint-disable-next-line no-await-in-loop
    tableBreakdownPreview[t] = await prisma[t].count(whereByTable[t] ? { where: whereByTable[t] } : undefined);
  }

  const externalReferences = [];
  for (const parent of scopeTables) {
    for (const edge of REFERRERS_BY_PARENT.get(parent) ?? []) {
      if (scopeSet.has(edge.childAccessor) || edge.onDelete === 'Cascade') continue;

      let where;
      if (whereByTable[parent]) {
        // eslint-disable-next-line no-await-in-loop
        const parentRows = await prisma[parent].findMany({
          where: whereByTable[parent],
          select: Object.fromEntries(edge.referencedFields.map((f) => [f, true])),
        });
        if (parentRows.length === 0) continue;
        const childRows = parentRows.map((row) =>
          Object.fromEntries(edge.fkFields.map((f, i) => [f, row[edge.referencedFields[i]]])),
        );
        where = whereFromRows(edge.fkFields, childRows);
      } else {
        where = notNullWhere(edge.fkFields, edge.fkFieldsNullable);
      }

      // eslint-disable-next-line no-await-in-loop
      const count = await prisma[edge.childAccessor].count({ where });
      if (count > 0) {
        externalReferences.push({
          table: edge.childAccessor,
          count,
          referencingField: edge.fkFields.join('+'),
          parentTable: parent,
        });
      }
    }
  }

  const recordCount = Object.values(tableBreakdownPreview).reduce((a, b) => a + b, 0);
  return { recordCount, tableBreakdownPreview, externalReferences };
}
