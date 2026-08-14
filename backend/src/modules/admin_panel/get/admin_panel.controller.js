import prisma from '../../../db.js';

// ─── Model registry ───────────────────────────────────────────────────────────
// idField:  string → simple PK field name
//           array  → composite PK [f1, f2]
// idType:   'int'    → parse id param as integer
//           'bigint' → parse id param as BigInt (BIGSERIAL PKs)
//           default  → string
// orderBy:  Prisma orderBy clause (omit if model has no usable sort column)

export const MODELS = {
  // ── Inventory ──────────────────────────────────────────────────────────────
  'rm-master': { model: 'rmMaster', group: 'masters', title: 'Raw Material Master',              idField: 'itemCode',                orderBy: { createdAt: 'desc' } },
  'packing-material': { model: 'packingMaterial', group: 'masters', title: 'Packing Material',        idField: 'id',                      orderBy: { createdAt: 'desc' } },
  'bulk-location': { model: 'bulkLocation', group: 'masters', title: 'Bulk Locations',           idField: 'locationId',              orderBy: { createdAt: 'desc' } },
  'bulk-lot-entry': { model: 'bulkLotEntry', group: 'inventory', title: 'Bulk Lot Entries',           idField: 'id',                      orderBy: { createdAt: 'desc' } },
  'bulk-lot-sequence': { model: 'bulkLotSequence', group: 'inventory', title: 'Bulk Lot Sequence',        idField: ['itemCode', 'year'],       orderBy: { year: 'desc' } },
  'lot-sequence': { model: 'lotSequence', group: 'inventory', title: 'Lot Sequence',            idField: ['itemCode', 'year'],       orderBy: { year: 'desc' } },
  'print-master': { model: 'printMaster', group: 'inventory', title: 'Print Master',            idField: 'id',                       orderBy: { createdAt: 'desc' } },
  'pack-detail': { model: 'packDetail', group: 'inventory', title: 'Pack Detail',             idField: 'packId'                                                  },
  'container-master': { model: 'containerMaster', group: 'masters', title: 'Container Master',        idField: 'containerId'                                             },
  'stock-ledger': { model: 'stockLedger', group: 'inventory', title: 'Stock Ledger',            idField: 'id',                      orderBy: { timestamp: 'desc' } },
  'outward': { model: 'outward', group: 'inventory', title: 'Outward',                idField: 'id',                      orderBy: { timestamp: 'desc' } },
  'bom-issue-session': { model: 'bomIssueSession', group: 'inventory', title: 'BOM Issue',         idField: 'id',                      orderBy: { updatedAt: 'desc' } },

  // ── Sales ──────────────────────────────────────────────────────────────────
  'sales-order': { model: 'salesOrder', group: 'sales', title: 'Sales Orders',             idField: 'id',         orderBy: { createdAt: 'desc' } },
  'sales-order-item': { model: 'salesOrderItem', group: 'sales', title: 'Sales Order Items',         idField: 'id',         orderBy: { createdAt: 'desc' } },
  'so-sequence': { model: 'soSequence', group: 'sales', title: 'SO Sequence',             idField: 'year', idType: 'int', orderBy: { year: 'desc' } },
  'customer-profile': { model: 'customerProfile', group: 'sales', title: 'Customer Profiles',        idField: 'id',         orderBy: { updatedAt: 'desc' } },
  'customer-product-profile': { model: 'customerProductProfile', group: 'sales', title: 'Customer Product Profiles', idField: 'id',         orderBy: { lastOrderedAt: 'desc' } },
  'sheet-sync-log': { model: 'sheetSyncLog', group: 'sales', title: 'Sheet Sync Logs',           idField: 'id',         orderBy: { createdAt: 'desc' } },

  // ── Production ─────────────────────────────────────────────────────────────
  'product-master': { model: 'productMaster', group: 'masters', title: 'Product Master',    idField: 'productCode',  orderBy: { createdAt: 'desc' } },
  'equipment-master': { model: 'equipmentMaster', group: 'masters', title: 'Equipment Master',  idField: 'equipId',      orderBy: { createdAt: 'desc' } },
  'production-task': { model: 'productionTask', group: 'production', title: 'Production Tasks',   idField: 'id',           orderBy: { createdAt: 'desc' } },
  'recipe-db': { model: 'recipeDb', group: 'masters', title: 'Recipe DB (BOM)',         idField: 'id',           orderBy: { productCode: 'asc' } },
  'indent-master': { model: 'indentMaster', group: 'production', title: 'Indent Master',     idField: 'indentId',     orderBy: { createdAt: 'desc' } },
  'indent-details': { model: 'indentDetails', group: 'production', title: 'Indent Details',    idField: 'id'                                           },
  'sfg-master': { model: 'sfgMaster', group: 'production', title: 'SFG Master',        idField: 'sfgId',        orderBy: { createdAt: 'desc' } },
  'production-batch': { model: 'productionBatch', group: 'production', title: 'Production Batches',  idField: 'id',           orderBy: { createdAt: 'desc' } },
  'biomass-input': { model: 'biomassInput', group: 'production', title: 'Biomass Inputs',     idField: 'id'                                           },
  'technical-detail': { model: 'technicalDetail', group: 'production', title: 'Technical Details',  idField: 'id'                                           },
  'formulation-cycle': { model: 'formulationCycle', group: 'production', title: 'Formulation Cycles', idField: 'id'                                           },
  'unloading-log': { model: 'unloadingLog', group: 'production', title: 'Unloading Logs',     idField: 'id'                                           },
  'sieving-log': { model: 'sievingLog', group: 'production', title: 'Sieving Logs',       idField: 'id'                                           },
  'packing-log': { model: 'packingLog', group: 'production', title: 'Packing Logs',       idField: 'id'                                           },
  'qc-sample': { model: 'qcSample', group: 'production', title: 'QC Samples',         idField: 'id'                                           },
  'inventory-handover': { model: 'inventoryHandover', group: 'production', title: 'Inventory Handovers',idField: 'id'                                           },

  // ── Planning ───────────────────────────────────────────────────────────────
  'production-plan': { model: 'productionPlan', group: 'planning', title: 'Production Plans', idField: 'id',   orderBy: { createdAt: 'desc' } },
  'plan-sequence': { model: 'planSequence', group: 'planning', title: 'Plan Sequence',   idField: 'year', idType: 'int', orderBy: { year: 'desc' } },
  'planner-log': { model: 'plannerLog', group: 'planning', title: 'Planner Logs',     idField: 'id',   orderBy: { runAt: 'desc' } },
  'bom-send': { model: 'bomSend', group: 'planning', title: 'BOM Send Requests',        idField: 'id',   orderBy: { sentAt: 'desc' } },

  // ── HR ─────────────────────────────────────────────────────────────────────
  'company-master': { model: 'companyMaster', group: 'masters', title: 'Company Master',  idField: 'id',   orderBy: { createdAt: 'desc' } },
  'employee-master': { model: 'employeeMaster', group: 'masters', title: 'Employee Master', idField: 'id',   orderBy: { createdAt: 'desc' } },
  'role-permission': { model: 'rolePermission', group: 'hr', title: 'Role Permissions', idField: 'id'                                   },

  // ── System ─────────────────────────────────────────────────────────────────
  'users': { model: 'user', group: 'system', title: 'Users',     idField: 'userId',  orderBy: { createdAt: 'desc' } },
  'audit-log': { model: 'auditLog', group: 'system', title: 'Audit Log', idField: 'id', idType: 'bigint', orderBy: { createdAt: 'desc' } },

  // ── ERP Masters ────────────────────────────────────────────────────────────
  'reason-codes': { model: 'reasonCode', group: 'legacy', title: 'Reason Codes',         idField: 'codeId',       idType: 'int', orderBy: { category: 'asc' } },
  'erp-suppliers': { model: 'erpSupplier', group: 'legacy', title: 'ERP Suppliers',        idField: 'supplierId',   orderBy: { supplierName: 'asc' } },
  'erp-plants': { model: 'erpPlant', group: 'legacy', title: 'ERP Plants',           idField: 'plantId',      orderBy: { plantName: 'asc' } },
  'erp-equipment': { model: 'erpEquipment', group: 'legacy', title: 'ERP Equipment',       idField: 'equipmentId',  orderBy: { equipmentName: 'asc' } },
  'erp-items': { model: 'erpItem', group: 'legacy', title: 'ERP Items',            idField: 'itemCode',     orderBy: { itemName: 'asc' } },
  'customers': { model: 'customer', group: 'legacy', title: 'Customers',           idField: 'customerId',   orderBy: { customerName: 'asc' } },
  'erp-products': { model: 'erpProduct', group: 'legacy', title: 'ERP Products',         idField: 'productCode',  orderBy: { productName: 'asc' } },
  'bom-headers': { model: 'erpBomHeader', group: 'legacy', title: 'BOM Headers',       idField: 'bomId',        orderBy: { createdAt: 'desc' } },
  'bom-lines-formulation': { model: 'erpBomLineFormulation', group: 'legacy', title: 'BOM Lines (Formulation)', idField: 'id'                                         },
  'bom-lines-packing': { model: 'erpBomLinePacking', group: 'legacy', title: 'BOM Lines (Packing)',  idField: 'id'                                           },
  'gate-lot-sequences': { model: 'gateLotSequence', group: 'legacy', title: 'Gate Lot Sequences',    idField: ['itemCode', 'year'], orderBy: { year: 'desc' } },

  // ── ERP Inventory ──────────────────────────────────────────────────────────
  'gate-inward': { model: 'gateInward', group: 'gate', title: 'Gate Inward',       idField: 'inwardId',    orderBy: { createdAt: 'desc' } },
  'erp-packs': { model: 'erpPack', group: 'legacy', title: 'ERP Packs',          idField: 'packId',      orderBy: { createdAt: 'desc' } },
  'gate-outward': { model: 'gateOutward', group: 'gate', title: 'Gate Outward',      idField: 'outwardId',   orderBy: { createdAt: 'desc' } },
  'stock-adjustments': { model: 'stockAdjustment', group: 'legacy', title: 'Stock Adjustments',  idField: 'adjustmentId', orderBy: { raisedAt: 'desc' } },
  'warehouse-transfers': { model: 'warehouseTransfer', group: 'legacy', title: 'Warehouse Transfers', idField: 'transferId', orderBy: { initiatedAt: 'desc' } },
  'fifo-override-log': { model: 'fifoOverrideLog', group: 'legacy', title: 'FIFO Override Log',  idField: 'id',          orderBy: { createdAt: 'desc' } },
  'erp-containers': { model: 'erpContainer', group: 'legacy', title: 'ERP Containers',     idField: 'containerId', orderBy: { createdAt: 'desc' } },
  'decanting-log': { model: 'decantingLog', group: 'legacy', title: 'Decanting Log',     idField: 'id',          orderBy: { createdAt: 'desc' } },

  // ── ERP Sales (legacy) ─────────────────────────────────────────────────────
  'erp-sales-orders': { model: 'erpSalesOrder', group: 'legacy', title: 'ERP Sales Orders (legacy)', idField: 'diNumber', orderBy: { createdAt: 'desc' } },
  'order-dispatch': { model: 'orderDispatch', group: 'legacy', title: 'Order Dispatch (legacy)', idField: 'dispatchId', orderBy: { createdAt: 'desc' } },

  // ── ERP Production ─────────────────────────────────────────────────────────
  'erp-production-plans': { model: 'erpProductionPlan', group: 'legacy', title: 'ERP Production Plans (legacy)',      idField: 'planId',      orderBy: { createdAt: 'desc' } },
  'erp-production-jobs': { model: 'erpProductionJob', group: 'legacy', title: 'ERP Production Jobs (legacy)',       idField: 'jobId',       orderBy: { createdAt: 'desc' } },
  'job-equipment-assignments': { model: 'jobEquipmentAssignment', group: 'legacy', title: 'Job Equipment Assignments (legacy)', idField: 'id'                                           },
  'erp-bom-issuance': { model: 'erpBomIssuance', group: 'legacy', title: 'ERP BOM Issuance (legacy)',         idField: 'issuanceId',  orderBy: { issuedAt: 'desc' } },
  'batch-qc-records': { model: 'batchQcRecord', group: 'legacy', title: 'Batch QC Records (legacy)',          idField: 'qcId',        orderBy: { createdAt: 'desc' } },
  'production-loss-log': { model: 'productionLossLog', group: 'legacy', title: 'Production Loss Log (legacy)',      idField: 'id',          orderBy: { createdAt: 'desc' } },
  'time-motion-logs': { model: 'timeMotionLog', group: 'legacy', title: 'Time & Motion Logs (legacy)',          idField: 'id',          orderBy: { createdAt: 'desc' } },

  // ── Microbial ──────────────────────────────────────────────────────────────
  'microbial-strains': { model: 'microbialStrain', group: 'masters', title: 'Microbial Strains',          idField: 'strainId',      orderBy: { createdAt: 'desc' } },
  'microbial-containers': { model: 'microbialContainer', group: 'microbial', title: 'Microbial Containers',       idField: 'containerId',   orderBy: { createdAt: 'desc' } },
  'microbial-transactions': { model: 'microbialTransaction', group: 'microbial', title: 'Microbial Transactions',     idField: 'id',            orderBy: { dispatchDate: 'desc' } },
  'microbe-master': { model: 'microbeMaster', group: 'masters', title: 'Microbe Master',            idField: 'microbeId',     orderBy: { createdAt: 'desc' } },
  'microbial-sfg-container-seq': { model: 'microbialSfgContainerSeq', group: 'microbial', title: 'Microbial SFG Container Seq', idField: ['microbeCode', 'typeCode'] },
  'microbial-sfg-containers': { model: 'microbialSfgContainer', group: 'microbial', title: 'Microbial SFG Containers',    idField: 'containerId',   orderBy: { createdAt: 'desc' } },
  'microbial-sfg-inward': { model: 'microbialSfgInward', group: 'microbial', title: 'Microbial SFG Inward',       idField: 'inwardId',      orderBy: { createdAt: 'desc' } },
  'microbial-sfg-allocations': { model: 'microbialSfgAllocation', group: 'microbial', title: 'Microbial SFG Allocations',   idField: 'allocationId',  orderBy: { createdAt: 'desc' } },
  'microbial-sfg-outward': { model: 'microbialSfgOutward', group: 'microbial', title: 'Microbial SFG Outward',      idField: 'outwardId',     orderBy: { createdAt: 'desc' } },
  'microbial-sfg-outward-line': { model: 'microbialSfgOutwardLine', group: 'microbial', title: 'Microbial SFG Outward Lines',  idField: 'lineId',        orderBy: { createdAt: 'desc' } },
  'microbial-sfg-outward-session': { model: 'microbialSfgOutwardSession', group: 'microbial', title: 'Microbial SFG Outward Sessions', idField: 'id',        orderBy: { updatedAt: 'desc' } },

  // ── Notifications ──────────────────────────────────────────────────────────
  'notifications': { model: 'erpNotification', group: 'notifications', title: 'Notifications',         idField: 'notifId',    orderBy: { createdAt: 'desc' } },
  'notification-escalations': { model: 'notificationEscalation', group: 'notifications', title: 'Notification Escalations',  idField: 'id', idType: 'bigint', orderBy: { escalatedAt: 'desc' } },
  'notification-delivery-log': { model: 'notificationDeliveryLog', group: 'notifications', title: 'Notification Delivery Log', idField: 'id', idType: 'bigint', orderBy: { sentAt: 'desc' } },
};

// Fields stripped from every response for these resources — this endpoint
// returns raw Prisma rows with no per-model `select`, and 'users' now holds
// real bcrypt hashes since login moved to the database.
const REDACT = {
  users: ['passwordHash', 'pinHash'],
};

export function redact(resource, record) {
  const fields = REDACT[resource];
  if (!fields || !record) return record;
  const copy = { ...record };
  for (const f of fields) delete copy[f];
  return copy;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getMeta(resource) {
  return MODELS[resource] || null;
}

export function buildWhere(meta, params) {
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
  const val = meta.idType === 'bigint'
    ? BigInt(params.id)
    : meta.idType === 'int'
      ? parseInt(params.id)
      : params.id;
  return { [meta.idField]: val };
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export const listRecords = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(500, parseInt(req.query.limit) || 200);
    const skip  = (page - 1) * limit;

    const opts = { skip, take: limit };
    if (meta.orderBy) opts.orderBy = meta.orderBy;
    const [total, records] = await Promise.all([
      prisma[meta.model].count(),
      prisma[meta.model].findMany(opts),
    ]);

    return res.json({ success: true, data: records.map((r) => redact(req.params.resource, r)), total, page, limit });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export const getRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const where  = buildWhere(meta, req.params);
    const record = await prisma[meta.model].findUnique({ where });
    if (!record) return res.status(404).json({ success: false, error: 'Record not found', code: 'NOT_FOUND' });
    return res.json({ success: true, data: redact(req.params.resource, record) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

// GET /admin/stats — row counts for all tables (dashboard)
export const getStats = async (req, res) => {
  try {
    const counts = await Promise.all(
      Object.entries(MODELS).map(async ([key, meta]) => {
        try {
          const count = await prisma[meta.model].count();
          return [key, count];
        } catch {
          return [key, 0];
        }
      })
    );
    return res.json({ success: true, data: Object.fromEntries(counts) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}
