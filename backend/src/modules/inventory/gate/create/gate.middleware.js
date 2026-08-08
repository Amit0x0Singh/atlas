/**
 * Gate › Create — Local Middleware
 * Sanitizes, type-converts, and validates POST /api/gate/inward and
 * POST /api/gate/outward request bodies before they reach the controller.
 * Built entirely from the global preprocessing pipeline — see
 * middleware/preprocessing/index.js for what each stage does.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { VALID_COMPANIES_LOWER } from './gate.controller.js'

// invoice_no / vehicle_no are already covered by the pipeline's default
// identifier-pattern guard (they match `_no$`), listed here explicitly so
// the intent is visible at the call site without having to know that.
// All four fields are mandatory — mirrors validateGateOutward below so
// Inward and Outward enforce the same completeness rules.
// company is lowercased here (lowercaseFields) before the enum check runs,
// so "SOM Phytopharma" / "som phytopharma" / "SOM PHYTOPHARMA" all validate
// the same, matching companyName's RULES.LOWER storage.
export const validateGateInward = preprocess({
  excludeFromConversion: ['invoice_no', 'vehicle_no'],
  lowercaseFields: ['company'],
  schema: {
    supplier_name: { required: true, minLength: 2, maxLength: 150 },
    company:       { required: true, enum: VALID_COMPANIES_LOWER },
    invoice_no:    { required: true, maxLength: 50 },
    vehicle_no:    { required: true, maxLength: 20 },
  },
})

export const validateManualGateInward = preprocess({
  excludeFromConversion: ['invoice_no'],
  schema: {
    supplier_name: { required: true, minLength: 2, maxLength: 150 },
    invoice_no:    { required: true, maxLength: 50 },
    received_date: { required: true },
  },
})

export const validateGateOutward = preprocess({
  excludeFromConversion: ['invoice_no', 'vehicle_no'],
  lowercaseFields: ['company'],
  schema: {
    receiver_name: { required: true, minLength: 2, maxLength: 150 },
    company:       { required: true, enum: VALID_COMPANIES_LOWER },
    invoice_no:    { required: true, maxLength: 50 },
    vehicle_no:    { required: true, maxLength: 20 },
  },
})
