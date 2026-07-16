/**
 * Master Data › ERP Masters › Create — Local Middleware
 * Covers all 9 create endpoints in this controller. uom canonical
 * conversion (normalizeUom/toCanonical) stays in the controller — business
 * logic, not a generic sanitize/validate concern. formulation_lines /
 * packing_lines on createBom are structured nested arrays the controller
 * already validates line-by-line (toCanonical throws per bad line) — this
 * middleware only checks the BOM header's own required fields.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

const idFields = [
  'item_code', 'product_code', 'container_id', 'container_qr', 'equipment_code',
  'plant_code', 'customer_code', 'gstin', 'phone', 'plant_id', 'alternate_plant_id',
  'microbial_strain_id',
]

export const validateCreateItem = preprocess({
  excludeFromConversion: idFields,
  schema: {
    item_code:     { required: true },
    item_name:     { required: true, minLength: 2 },
    item_category: { required: true },
    uom:           { required: true },
  },
})

export const validateCreateSupplier = preprocess({
  excludeFromConversion: idFields,
  schema: {
    supplier_name: { required: true, minLength: 2 },
    phone:         { phone: true },
    email:         { email: true },
  },
})

export const validateCreatePlant = preprocess({
  excludeFromConversion: idFields,
  schema: {
    plant_name: { required: true, minLength: 2 },
    plant_code: { required: true },
    plant_type: { required: true },
  },
})

export const validateCreateErpEquipment = preprocess({
  excludeFromConversion: idFields,
  schema: {
    equipment_name: { required: true, minLength: 2 },
    equipment_code: { required: true },
    equipment_type: { required: true },
  },
})

export const validateCreateErpProduct = preprocess({
  excludeFromConversion: idFields,
  schema: {
    product_code: { required: true },
    product_name: { required: true, minLength: 2 },
  },
})

export const validateCreateBom = preprocess({
  excludeFromConversion: idFields,
  schema: {
    product_code:    { required: true },
    bom_version:     { required: true },
    effective_date:  { required: true },
  },
})

export const validateCreateStrain = preprocess({
  schema: {
    strain_name: { required: true, minLength: 2 },
    decay_k:     { required: true },
  },
})

export const validateCreateCustomer = preprocess({
  excludeFromConversion: idFields,
  schema: {
    customer_name: { required: true, minLength: 2 },
    phone:         { phone: true },
    email:         { email: true },
  },
})

export const validateCreateErpContainer = preprocess({
  excludeFromConversion: idFields,
  schema: {
    container_id: { required: true },
    item_code:    { required: true },
    max_capacity: { required: true, positive: true },
  },
})
