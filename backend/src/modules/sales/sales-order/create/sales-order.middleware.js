import { preprocess } from '../../../../middleware/preprocessing/index.js'

// Exact vocabulary from prisma/model/sales/sales.prisma's own comments on
// SalesOrder.orderType / SalesOrder.priority — NOT the different legacy
// ErpSalesOrder vocabulary elsewhere in the same schema file.
export const ORDER_TYPES = ['DOMESTIC', 'EXPORT', 'SAMPLE']
export const PRIORITIES = ['URGENT', 'VERY_URGENT', 'MODERATE']

// diNo/invoiceNo/company are camelCase "...No"/free-text fields the
// preprocessing pipeline's default identifier patterns don't already
// protect from numeric coercion (those patterns only match snake_case
// `_no`/`_code` suffixes or camelCase `...Id` — not camelCase `...No`) —
// an all-digit DI number or invoice number would otherwise get silently
// turned into a JS Number by convertTypes.
export const validateCreateSalesOrder = preprocess({
  excludeFromConversion: ['diNo', 'invoiceNo', 'company'],
  schema: {
    company:       { required: true, maxLength: 20 },       // company list is DB-driven (CompanyMaster), not a fixed enum here
    diNo:          { required: true, maxLength: 50 },
    customerName:  { required: true, minLength: 2, maxLength: 200 },
    orderType:     { required: true, enum: ORDER_TYPES },
    priority:      { enum: PRIORITIES },
    invoiceNo:     { maxLength: 50 },
    transportName: { maxLength: 150 },
    remarks:       { maxLength: 1000 },
  },
})

// Only covers top-level SalesOrder fields — the preprocessing pipeline has
// no nested/array schema support today, so the items[] line-item array
// keeps using the existing manual per-item check in the controller.
export const validateUpdateSalesOrder = preprocess({
  excludeFromConversion: ['diNo', 'invoiceNo', 'company'],
  schema: {
    company:       { maxLength: 20 },
    diNo:          { maxLength: 50 },
    customerName:  { minLength: 2, maxLength: 200 },
    orderType:     { enum: ORDER_TYPES },
    priority:      { enum: PRIORITIES },
    invoiceNo:     { maxLength: 50 },
    transportName: { maxLength: 150 },
    remarks:       { maxLength: 1000 },
  },
})
