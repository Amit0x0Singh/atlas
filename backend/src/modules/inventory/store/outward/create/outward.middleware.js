/**
 * Store › Outward › Create — Local Middleware
 * Validates the flat-body outward endpoints. bomLines on the BOM-session
 * upsert endpoint is deliberately left untouched — it's an arbitrary nested
 * JSON checklist structure, the same class of field the admin-panel CRUD
 * routes are excluded for (see middleware/preprocessing plan notes).
 */
import { preprocess } from '../../../../../middleware/preprocessing/index.js'

const idFields = ['indentId', 'rmCode', 'packId', 'itemCode', 'sourceId', 'containerId', 'productCode', 'batchRef']

export const validateBomScan = preprocess({
  excludeFromConversion: idFields,
  schema: {
    indentId: { required: true },
    rmCode:   { required: true },
    packId:   { required: true },
  },
})

export const validateBomManual = preprocess({
  excludeFromConversion: idFields,
  schema: {
    indentId:    { required: true },
    rmCode:      { required: true },
    packId:      { required: true },
    qtyToIssue:  { required: true, positive: true },
  },
})

export const validatePackReduction = preprocess({
  excludeFromConversion: idFields,
  schema: {
    packId: { required: true },
    qty:    { required: true, positive: true },
  },
})

export const validateBagLossAdjustment = preprocess({
  excludeFromConversion: idFields,
  schema: {
    packId:  { required: true },
    lossQty: { required: true, positive: true },
    reason:  { required: true, minLength: 3 },
  },
})

export const validateContainerLossAdjustment = preprocess({
  excludeFromConversion: idFields,
  schema: {
    containerId: { required: true },
    lossQty:     { required: true, positive: true },
    reason:      { required: true, minLength: 3 },
  },
})

export const validateStockAdjustment = preprocess({
  excludeFromConversion: idFields,
  schema: {
    itemCode:      { required: true },
    adjustmentQty: { required: true },
    remarks:       { required: true, minLength: 5 },
  },
})

export const validateWarehouseTransfer = preprocess({
  excludeFromConversion: idFields,
  schema: {
    packId:      { required: true },
    toWarehouse: { required: true },
  },
})

export const validateDirectIssue = preprocess({
  excludeFromConversion: idFields,
  schema: {
    packId: { required: true },
    qty:    { required: true, positive: true },
    plant:  { required: true },
  },
})

export const validateBomDirectIssue = preprocess({
  excludeFromConversion: idFields,
  schema: {
    source:   { required: true, enum: ['pack', 'container'] },
    sourceId: { required: true },
    qty:      { required: true, positive: true },
    rmCode:   { required: true },
  },
})
