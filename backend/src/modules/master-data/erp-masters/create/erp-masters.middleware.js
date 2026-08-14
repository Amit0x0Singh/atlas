/**
 * Master Data › ERP Masters › Create — Local Middleware
 * Covers all 5 create endpoints in this controller. uom canonical
 * conversion (normalizeUom/toCanonical) stays in the controller — business
 * logic, not a generic sanitize/validate concern.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

const idFields = [
  'equipment_code', 'plant_code', 'customer_code', 'gstin', 'phone', 'plant_id',
]

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
