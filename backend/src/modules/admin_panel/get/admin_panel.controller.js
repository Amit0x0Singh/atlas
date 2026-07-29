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
  'rm-master': { model: 'rmMaster', group: 'masters',              idField: 'itemCode',                orderBy: { createdAt: 'desc' } },
  'packing-material': { model: 'packingMaterial', group: 'masters',        idField: 'id',                      orderBy: { createdAt: 'desc' } },
  'bulk-location': { model: 'bulkLocation', group: 'masters',           idField: 'locationId',              orderBy: { createdAt: 'desc' } },
  'bulk-lot-entry': { model: 'bulkLotEntry', group: 'inventory',           idField: 'id',                      orderBy: { createdAt: 'desc' } },
  'bulk-lot-sequence': { model: 'bulkLotSequence', group: 'inventory',        idField: ['itemCode', 'year'],       orderBy: { year: 'desc' } },
  'lot-sequence': { model: 'lotSequence', group: 'inventory',            idField: ['itemCode', 'year'],       orderBy: { year: 'desc' } },
  'print-master': { model: 'printMaster', group: 'inventory',            idField: 'id',                       orderBy: { createdAt: 'desc' } },
  'pack-detail': { model: 'packDetail', group: 'inventory',             idField: 'packId'                                                  },
  'container-master': { model: 'containerMaster', group: 'masters',        idField: 'containerId'                                             },
  'stock-ledger': { model: 'stockLedger', group: 'inventory',            idField: 'id',                      orderBy: { timestamp: 'desc' } },
  'outward': { model: 'outward', group: 'inventory',                idField: 'id',                      orderBy: { timestamp: 'desc' } },
  'bom-issue-session': { model: 'bomIssueSession', group: 'inventory',         idField: 'id',                      orderBy: { updatedAt: 'desc' } },

  // ── Sales ──────────────────────────────────────────────────────────────────
  'sales-order': { model: 'salesOrder', group: 'sales',             idField: 'id',         orderBy: { createdAt: 'desc' } },
  'sales-order-item': { model: 'salesOrderItem', group: 'sales',         idField: 'id',         orderBy: { createdAt: 'desc' } },
  'so-sequence': { model: 'soSequence', group: 'sales',             idField: 'year', idType: 'int', orderBy: { year: 'desc' } },
  'customer-profile': { model: 'customerProfile', group: 'sales',        idField: 'id',         orderBy: { updatedAt: 'desc' } },
  'customer-product-profile': { model: 'customerProductProfile', group: 'sales', idField: 'id',         orderBy: { lastOrderedAt: 'desc' } },
  'sheet-sync-log': { model: 'sheetSyncLog', group: 'sales',           idField: 'id',         orderBy: { createdAt: 'desc' } },

  // ── Production ─────────────────────────────────────────────────────────────
  'product-master': { model: 'productMaster', group: 'masters',    idField: 'productCode',  orderBy: { createdAt: 'desc' } },
  'equipment-master': { model: 'equipmentMaster', group: 'masters',  idField: 'equipId',      orderBy: { createdAt: 'desc' } },
  'production-task': { model: 'productionTask', group: 'production',   idField: 'id',           orderBy: { createdAt: 'desc' } },
  'recipe-db': { model: 'recipeDb', group: 'masters',         idField: 'id',           orderBy: { productCode: 'asc' } },
  'indent-master': { model: 'indentMaster', group: 'production',     idField: 'indentId',     orderBy: { createdAt: 'desc' } },
  'indent-details': { model: 'indentDetails', group: 'production',    idField: 'id'                                           },
  'sfg-master': { model: 'sfgMaster', group: 'production',        idField: 'sfgId',        orderBy: { createdAt: 'desc' } },
  'production-batch': { model: 'productionBatch', group: 'production',  idField: 'id',           orderBy: { createdAt: 'desc' } },
  'biomass-input': { model: 'biomassInput', group: 'production',     idField: 'id'                                           },
  'technical-detail': { model: 'technicalDetail', group: 'production',  idField: 'id'                                           },
  'formulation-cycle': { model: 'formulationCycle', group: 'production', idField: 'id'                                           },
  'unloading-log': { model: 'unloadingLog', group: 'production',     idField: 'id'                                           },
  'sieving-log': { model: 'sievingLog', group: 'production',       idField: 'id'                                           },
  'packing-log': { model: 'packingLog', group: 'production',       idField: 'id'                                           },
  'qc-sample': { model: 'qcSample', group: 'production',         idField: 'id'                                           },
  'inventory-handover': { model: 'inventoryHandover', group: 'production',idField: 'id'                                           },

  // ── Planning ───────────────────────────────────────────────────────────────
  'production-plan': { model: 'productionPlan', group: 'planning', idField: 'id',   orderBy: { createdAt: 'desc' } },
  'plan-sequence': { model: 'planSequence', group: 'planning',   idField: 'year', idType: 'int', orderBy: { year: 'desc' } },
  'planner-log': { model: 'plannerLog', group: 'planning',     idField: 'id',   orderBy: { runAt: 'desc' } },
  'bom-send': { model: 'bomSend', group: 'planning',        idField: 'id',   orderBy: { sentAt: 'desc' } },

  // ── HR ─────────────────────────────────────────────────────────────────────
  'company-master': { model: 'companyMaster', group: 'masters',  idField: 'id',   orderBy: { createdAt: 'desc' } },
  'employee-master': { model: 'employeeMaster', group: 'masters', idField: 'id',   orderBy: { createdAt: 'desc' } },
  'role-permission': { model: 'rolePermission', group: 'hr', idField: 'id'                                   },

  // ── System ─────────────────────────────────────────────────────────────────
  'users': { model: 'user', group: 'system',     idField: 'userId',  orderBy: { createdAt: 'desc' } },
  'audit-log': { model: 'auditLog', group: 'system', idField: 'id', idType: 'bigint', orderBy: { createdAt: 'desc' } },

  // ── ERP Masters ────────────────────────────────────────────────────────────
  'reason-codes': { model: 'reasonCode', group: 'legacy',         idField: 'codeId',       idType: 'int', orderBy: { category: 'asc' } },
  'erp-suppliers': { model: 'erpSupplier', group: 'legacy',        idField: 'supplierId',   orderBy: { supplierName: 'asc' } },
  'erp-plants': { model: 'erpPlant', group: 'legacy',           idField: 'plantId',      orderBy: { plantName: 'asc' } },
  'erp-equipment': { model: 'erpEquipment', group: 'legacy',       idField: 'equipmentId',  orderBy: { equipmentName: 'asc' } },
  'erp-items': { model: 'erpItem', group: 'legacy',            idField: 'itemCode',     orderBy: { itemName: 'asc' } },
  'customers': { model: 'customer', group: 'legacy',           idField: 'customerId',   orderBy: { customerName: 'asc' } },
  'erp-products': { model: 'erpProduct', group: 'legacy',         idField: 'productCode',  orderBy: { productName: 'asc' } },
  'bom-headers': { model: 'erpBomHeader', group: 'legacy',       idField: 'bomId',        orderBy: { createdAt: 'desc' } },
  'bom-lines-formulation': { model: 'erpBomLineFormulation', group: 'legacy', idField: 'id'                                         },
  'bom-lines-packing': { model: 'erpBomLinePacking', group: 'legacy',  idField: 'id'                                           },
  'gate-lot-sequences': { model: 'gateLotSequence', group: 'legacy',    idField: ['itemCode', 'year'], orderBy: { year: 'desc' } },

  // ── ERP Inventory ──────────────────────────────────────────────────────────
  'gate-inward': { model: 'gateInward', group: 'gate',       idField: 'inwardId',    orderBy: { createdAt: 'desc' } },
  'erp-packs': { model: 'erpPack', group: 'legacy',          idField: 'packId',      orderBy: { createdAt: 'desc' } },
  'gate-outward': { model: 'gateOutward', group: 'gate',      idField: 'outwardId',   orderBy: { createdAt: 'desc' } },
  'stock-adjustments': { model: 'stockAdjustment', group: 'legacy',  idField: 'adjustmentId', orderBy: { raisedAt: 'desc' } },
  'warehouse-transfers': { model: 'warehouseTransfer', group: 'legacy', idField: 'transferId', orderBy: { initiatedAt: 'desc' } },
  'fifo-override-log': { model: 'fifoOverrideLog', group: 'legacy',  idField: 'id',          orderBy: { createdAt: 'desc' } },
  'erp-containers': { model: 'erpContainer', group: 'legacy',     idField: 'containerId', orderBy: { createdAt: 'desc' } },
  'decanting-log': { model: 'decantingLog', group: 'legacy',     idField: 'id',          orderBy: { createdAt: 'desc' } },

  // ── ERP Sales (legacy) ─────────────────────────────────────────────────────
  'erp-sales-orders': { model: 'erpSalesOrder', group: 'legacy', idField: 'diNumber', orderBy: { createdAt: 'desc' } },
  'order-dispatch': { model: 'orderDispatch', group: 'legacy', idField: 'dispatchId', orderBy: { createdAt: 'desc' } },

  // ── ERP Production ─────────────────────────────────────────────────────────
  'erp-production-plans': { model: 'erpProductionPlan', group: 'legacy',      idField: 'planId',      orderBy: { createdAt: 'desc' } },
  'erp-production-jobs': { model: 'erpProductionJob', group: 'legacy',       idField: 'jobId',       orderBy: { createdAt: 'desc' } },
  'job-equipment-assignments': { model: 'jobEquipmentAssignment', group: 'legacy', idField: 'id'                                           },
  'erp-bom-issuance': { model: 'erpBomIssuance', group: 'legacy',         idField: 'issuanceId',  orderBy: { issuedAt: 'desc' } },
  'batch-qc-records': { model: 'batchQcRecord', group: 'legacy',          idField: 'qcId',        orderBy: { createdAt: 'desc' } },
  'production-loss-log': { model: 'productionLossLog', group: 'legacy',      idField: 'id',          orderBy: { createdAt: 'desc' } },
  'time-motion-logs': { model: 'timeMotionLog', group: 'legacy',          idField: 'id',          orderBy: { createdAt: 'desc' } },

  // ── Microbial ──────────────────────────────────────────────────────────────
  'microbial-strains': { model: 'microbialStrain', group: 'masters',          idField: 'strainId',      orderBy: { createdAt: 'desc' } },
  'microbial-containers': { model: 'microbialContainer', group: 'microbial',       idField: 'containerId',   orderBy: { createdAt: 'desc' } },
  'microbial-transactions': { model: 'microbialTransaction', group: 'microbial',     idField: 'id',            orderBy: { dispatchDate: 'desc' } },
  'microbe-master': { model: 'microbeMaster', group: 'masters',            idField: 'microbeId',     orderBy: { createdAt: 'desc' } },
  'microbial-sfg-container-seq': { model: 'microbialSfgContainerSeq', group: 'microbial', idField: ['microbeCode', 'typeCode'] },
  'microbial-sfg-containers': { model: 'microbialSfgContainer', group: 'microbial',    idField: 'containerId',   orderBy: { createdAt: 'desc' } },
  'microbial-sfg-inward': { model: 'microbialSfgInward', group: 'microbial',       idField: 'inwardId',      orderBy: { createdAt: 'desc' } },
  'microbial-sfg-allocations': { model: 'microbialSfgAllocation', group: 'microbial',   idField: 'allocationId',  orderBy: { createdAt: 'desc' } },
  'microbial-sfg-outward': { model: 'microbialSfgOutward', group: 'microbial',      idField: 'outwardId',     orderBy: { createdAt: 'desc' } },
  'microbial-sfg-outward-line': { model: 'microbialSfgOutwardLine', group: 'microbial',  idField: 'lineId',        orderBy: { createdAt: 'desc' } },
  'microbial-sfg-outward-session': { model: 'microbialSfgOutwardSession', group: 'microbial', idField: 'id',        orderBy: { updatedAt: 'desc' } },

  // ── Notifications ──────────────────────────────────────────────────────────
  'notifications': { model: 'erpNotification', group: 'notifications',         idField: 'notifId',    orderBy: { createdAt: 'desc' } },
  'notification-escalations': { model: 'notificationEscalation', group: 'notifications',  idField: 'id', idType: 'bigint', orderBy: { escalatedAt: 'desc' } },
  'notification-delivery-log': { model: 'notificationDeliveryLog', group: 'notifications', idField: 'id', idType: 'bigint', orderBy: { sentAt: 'desc' } },
};

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

    return res.json({ success: true, data: records, total, page, limit });
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
    return res.json({ success: true, data: record });
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
