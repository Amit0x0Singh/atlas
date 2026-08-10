import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import {
  listSuppliers, listPlants, listErpEquipment,
  listStrains, listCustomers, listReasonCodes,
} from './get/erp-masters.controller.js'
import {
  createSupplier, createPlant, createErpEquipment,
  createStrain, createCustomer,
} from './create/erp-masters.controller.js'
import {
  validateCreateSupplier, validateCreatePlant, validateCreateErpEquipment,
  validateCreateStrain, validateCreateCustomer,
} from './create/erp-masters.middleware.js'
import { validateSupplierListQuery } from './get/erp-masters.middleware.js'
import { updateSupplier, patchErpEquipment } from './update/erp-masters.controller.js'
import { validateUpdateSupplier, validateUpdateErpEquipment } from './update/erp-masters.middleware.js'

const ErpMastersRouter = express.Router()
const adminOnly   = authorize(['admin'])
const storeManager = authorize(['admin', 'store'])

// ── ERP Suppliers ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/suppliers', authenticate, validateSupplierListQuery, listSuppliers)
ErpMastersRouter.post('/masters/suppliers', authenticate, storeManager, validateCreateSupplier, createSupplier)
ErpMastersRouter.put('/masters/suppliers/:id', authenticate, storeManager, validateUpdateSupplier, updateSupplier)

// ── ERP Plants ────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/plants', authenticate, listPlants)
ErpMastersRouter.post('/masters/plants', authenticate, adminOnly, validateCreatePlant, createPlant)

// ── ERP Equipment ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/equipment', authenticate, listErpEquipment)
ErpMastersRouter.post('/masters/equipment', authenticate, adminOnly, validateCreateErpEquipment, createErpEquipment)
ErpMastersRouter.patch('/masters/equipment/:id', authenticate, adminOnly, validateUpdateErpEquipment, patchErpEquipment)

// ── Microbial Strains ─────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/strains', authenticate, listStrains)
ErpMastersRouter.post('/masters/strains', authenticate, adminOnly, validateCreateStrain, createStrain)

// ── Customers ─────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/customers', authenticate, listCustomers)
ErpMastersRouter.post('/masters/customers', authenticate, authorize(['admin', 'store']), validateCreateCustomer, createCustomer)

// ── Reason Codes ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/reason-codes', authenticate, listReasonCodes)

export default ErpMastersRouter
