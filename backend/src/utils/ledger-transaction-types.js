// Canonical list of StockLedger.transactionType values actually written by
// the backend today. There's no Prisma enum backing this column (it's a
// plain String) — this file is the single source of truth for the ledger
// filter dropdown (GET /ledger/meta/transaction-types) so the frontend never
// offers a value the backend doesn't actually produce.
//
// Every write site, for reference:
//   INWARD             — services/inward-service.js (submitLotInward),
//                         modules/inventory/import/create/import.controller.js
//   BOM_ISSUANCE       — modules/inventory/store/outward/create/outward.controller.js
//                         (bomDirectIssue, bomScan/bomManual),
//                         modules/sales/bom-sends/{create,utils}/*.js
//   PACK_TO_CONTAINER  — outward.controller.js (packReduction),
//                         modules/inventory/store/containers/create/containers.controller.js (fillContainer)
//   STOCK_RECON        — outward.controller.js (bagLossAdjustment, stockAdjustment)
//   WAREHOUSE_TRANSFER — outward.controller.js (warehouseTransfer)
//   DIRECT_ISSUE       — outward.controller.js (directIssue)
//   CONTAINER_ISSUE    — containers.controller.js (issueFromContainer)
export const TRANSACTION_TYPES = [
  { value: 'INWARD',             label: 'Inward' },
  { value: 'BOM_ISSUANCE',       label: 'BOM Issuance' },
  { value: 'PACK_TO_CONTAINER',  label: 'Pack to Container' },
  { value: 'STOCK_RECON',        label: 'Stock Adjustment' },
  { value: 'WAREHOUSE_TRANSFER', label: 'Warehouse Transfer' },
  { value: 'DIRECT_ISSUE',       label: 'Direct Issue' },
  { value: 'CONTAINER_ISSUE',    label: 'Container Issue' },
]

export const TRANSACTION_TYPE_VALUES = new Set(TRANSACTION_TYPES.map(t => t.value))
