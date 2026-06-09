import prisma from '../../db.js';

// ─── Model registry ───────────────────────────────────────────────────────────
// idField:  string → simple PK field name
//           array  → composite PK [f1, f2]
// idType:   'int'  → parse id param as integer  (default: string)
// rawTable: truthy → use $queryRawUnsafe instead of prisma[model]
// orderBy:  Prisma orderBy clause (omit if model has no usable sort column)

const MODELS = {
  // ── Inventory ──────────────────────────────────────────────────────────────
  'rm-master':          { model: 'rmMaster',              idField: 'itemCode',                orderBy: { createdAt: 'desc' } },
  'bulk-location':      { model: 'bulkLocation',           idField: 'locationId',              orderBy: { createdAt: 'desc' } },
  'bulk-lot-entry':     { model: 'bulkLotEntry',           idField: 'id',                      orderBy: { createdAt: 'desc' } },
  'bulk-lot-sequence':  { model: 'bulkLotSequence',        idField: ['itemCode', 'year'],       orderBy: { year: 'desc' } },
  'lot-sequence':       { model: 'lotSequence',            idField: ['itemCode', 'year'],       orderBy: { year: 'desc' } },
  'print-master':       { model: 'printMaster',            idField: 'packId',                  orderBy: { createdAt: 'desc' } },
  'inward-session':     { model: 'inwardSession',          idField: 'sessionId',               orderBy: { createdAt: 'desc' } },
  'inward':             { model: 'inward',                 idField: 'id',                      orderBy: { inwardTime: 'desc' } },
  'pack-balance':       { model: 'packBalance',            idField: 'packId'                                                  },
  'container-master':   { model: 'containerMaster',        idField: 'containerId'                                             },
  'stock-ledger':       { model: 'stockLedger',            idField: 'id',                      orderBy: { timestamp: 'desc' } },
  'outward':            { model: 'outward',                idField: 'id',                      orderBy: { timestamp: 'desc' } },

  // ── Sales ──────────────────────────────────────────────────────────────────
  'sales-order':               { model: 'salesOrder',             idField: 'id',         orderBy: { createdAt: 'desc' } },
  'sales-order-item':          { model: 'salesOrderItem',         idField: 'id',         orderBy: { createdAt: 'desc' } },
  'so-sequence':               { model: 'soSequence',             idField: 'year', idType: 'int', orderBy: { year: 'desc' } },
  'customer-profile':          { model: 'customerProfile',        idField: 'id',         orderBy: { updatedAt: 'desc' } },
  'customer-product-profile':  { model: 'customerProductProfile', idField: 'id',         orderBy: { lastOrderedAt: 'desc' } },
  'sheet-sync-log':            { model: 'sheetSyncLog',           idField: 'id',         orderBy: { createdAt: 'desc' } },

  // ── Production ─────────────────────────────────────────────────────────────
  'product-master':     { model: 'productMaster',    idField: 'productCode',  orderBy: { createdAt: 'desc' } },
  'equipment-master':   { model: 'equipmentMaster',  idField: 'equipId',      orderBy: { createdAt: 'desc' } },
  'recipe-db':          { model: 'recipeDb',         idField: 'id',           orderBy: { productCode: 'asc' } },
  'indent-master':      { model: 'indentMaster',     idField: 'indentId',     orderBy: { createdAt: 'desc' } },
  'indent-details':     { model: 'indentDetails',    idField: 'id'                                           },
  'sfg-master':         { model: 'sfgMaster',        idField: 'sfgId',        orderBy: { createdAt: 'desc' } },
  'production-batch':   { model: 'productionBatch',  idField: 'id',           orderBy: { createdAt: 'desc' } },
  'biomass-input':      { model: 'biomassInput',     idField: 'id'                                           },
  'technical-detail':   { model: 'technicalDetail',  idField: 'id'                                           },
  'formulation-cycle':  { model: 'formulationCycle', idField: 'id'                                           },
  'unloading-log':      { model: 'unloadingLog',     idField: 'id'                                           },
  'sieving-log':        { model: 'sievingLog',       idField: 'id'                                           },
  'packing-log':        { model: 'packingLog',       idField: 'id'                                           },
  'qc-sample':          { model: 'qcSample',         idField: 'id'                                           },
  'inventory-handover': { model: 'inventoryHandover',idField: 'id'                                           },

  // ── Planning ───────────────────────────────────────────────────────────────
  'production-plan':  { model: 'productionPlan', idField: 'id',   orderBy: { createdAt: 'desc' } },
  'plan-sequence':    { model: 'planSequence',   idField: 'year', idType: 'int', orderBy: { year: 'desc' } },
  'planner-log':      { model: 'plannerLog',     idField: 'id',   orderBy: { runAt: 'desc' } },
  'bom-send':         { model: 'bomSend',        idField: 'id',   orderBy: { sentAt: 'desc' } },

  // ── HR ─────────────────────────────────────────────────────────────────────
  'company-master':   { model: 'companyMaster',  idField: 'id',   orderBy: { createdAt: 'desc' } },
  'employee-master':  { model: 'employeeMaster', idField: 'id',   orderBy: { createdAt: 'desc' } },
  'role-permission':  { model: 'rolePermission', idField: 'id'                                   },

  // ── Microbial (raw SQL tables — no Prisma model) ───────────────────────────
  'microbial-strains':      { rawTable: 'microbial_strains',      idField: 'strain_id',    orderBy: 'created_at DESC' },
  'microbial-containers':   { rawTable: 'microbial_containers',   idField: 'container_id', orderBy: 'created_at DESC' },
  'microbial-transactions': { rawTable: 'microbial_transactions', idField: 'id',           orderBy: 'dispatch_date DESC' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMeta(resource) {
  return MODELS[resource] || null;
}

function buildWhere(meta, params) {
  if (Array.isArray(meta.idField)) {
    const [f1, f2] = meta.idField;
    const key = `${f1}_${f2}`;
    return {
      [key]: {
        [f1]: params.p1,
        [f2]: f2 === 'year' ? parseInt(params.p2) : params.p2,
      },
    };
  }
  const val = meta.idType === 'int' ? parseInt(params.id) : params.id;
  return { [meta.idField]: val };
}

// ─── Raw SQL helpers for microbial tables ────────────────────────────────────

async function rawList(table, orderBy, limit, skip) {
  return prisma.$queryRawUnsafe(
    `SELECT * FROM ${table} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
    limit, skip
  );
}

async function rawCount(table) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM ${table}`);
  return rows[0]?.cnt ?? 0;
}

async function rawGetOne(table, idField, idValue) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM ${table} WHERE ${idField} = $1 LIMIT 1`,
    idValue
  );
  return rows[0] ?? null;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function listRecords(req, res) {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource' });
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(500, parseInt(req.query.limit) || 200);
    const skip  = (page - 1) * limit;

    let records, total;

    if (meta.rawTable) {
      [records, total] = await Promise.all([
        rawList(meta.rawTable, meta.orderBy || 'ctid', limit, skip),
        rawCount(meta.rawTable),
      ]);
    } else {
      const opts = { skip, take: limit };
      if (meta.orderBy) opts.orderBy = meta.orderBy;
      [total, records] = await Promise.all([
        prisma[meta.model].count(),
        prisma[meta.model].findMany(opts),
      ]);
    }

    return res.json({ success: true, data: records, total, page, limit });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getRecord(req, res) {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource' });
  try {
    let record;

    if (meta.rawTable) {
      if (Array.isArray(meta.idField)) {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM ${meta.rawTable} WHERE ${meta.idField[0]} = $1 AND ${meta.idField[1]} = $2 LIMIT 1`,
          req.params.p1, req.params.p2
        );
        record = rows[0] ?? null;
      } else {
        record = await rawGetOne(meta.rawTable, meta.idField, req.params.id);
      }
    } else {
      const where = buildWhere(meta, req.params);
      record = await prisma[meta.model].findUnique({ where });
    }

    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createRecord(req, res) {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource' });
  try {
    if (meta.rawTable) {
      const cols = Object.keys(req.body);
      const vals = Object.values(req.body);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const rows = await prisma.$queryRawUnsafe(
        `INSERT INTO ${meta.rawTable} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        ...vals
      );
      return res.status(201).json({ success: true, data: rows[0] });
    }
    const record = await prisma[meta.model].create({ data: req.body });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function updateRecord(req, res) {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource' });
  try {
    if (meta.rawTable) {
      const sets = Object.keys(req.body).map((k, i) => `${k} = $${i + 1}`).join(', ');
      const vals = Object.values(req.body);
      const idParam = Array.isArray(meta.idField)
        ? `${meta.idField[0]} = $${vals.length + 1} AND ${meta.idField[1]} = $${vals.length + 2}`
        : `${meta.idField} = $${vals.length + 1}`;
      const idVals = Array.isArray(meta.idField) ? [req.params.p1, req.params.p2] : [req.params.id];
      const rows = await prisma.$queryRawUnsafe(
        `UPDATE ${meta.rawTable} SET ${sets} WHERE ${idParam} RETURNING *`,
        ...vals, ...idVals
      );
      return res.json({ success: true, data: rows[0] });
    }
    const where  = buildWhere(meta, req.params);
    const record = await prisma[meta.model].update({ where, data: req.body });
    return res.json({ success: true, data: record });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function deleteRecord(req, res) {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource' });
  try {
    if (meta.rawTable) {
      const idParam = Array.isArray(meta.idField)
        ? `${meta.idField[0]} = $1 AND ${meta.idField[1]} = $2`
        : `${meta.idField} = $1`;
      const idVals = Array.isArray(meta.idField) ? [req.params.p1, req.params.p2] : [req.params.id];
      await prisma.$queryRawUnsafe(`DELETE FROM ${meta.rawTable} WHERE ${idParam}`, ...idVals);
      return res.json({ success: true });
    }
    const where = buildWhere(meta, req.params);
    await prisma[meta.model].delete({ where });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

// GET /admin/stats — row counts for all tables (dashboard)
export async function getStats(req, res) {
  try {
    const counts = await Promise.all(
      Object.entries(MODELS).map(async ([key, meta]) => {
        try {
          const count = meta.rawTable
            ? await rawCount(meta.rawTable)
            : await prisma[meta.model].count();
          return [key, count];
        } catch {
          return [key, 0];
        }
      })
    );
    return res.json({ success: true, data: Object.fromEntries(counts) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
