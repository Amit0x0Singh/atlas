import express from 'express'
import { authorize } from '../../../middleware/auth.js'
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

// ── ERP Suppliers ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/suppliers', authorize('masters.erp-supplier.view'), validateSupplierListQuery, listSuppliers)
ErpMastersRouter.post('/masters/suppliers', authorize('masters.erp-supplier.create'), validateCreateSupplier, createSupplier)
ErpMastersRouter.put('/masters/suppliers/:id', authorize('masters.erp-supplier.update'), validateUpdateSupplier, updateSupplier)

// ── ERP Plants ────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/plants', authorize('masters.erp-plant.view'), listPlants)
ErpMastersRouter.post('/masters/plants', authorize('masters.erp-plant.create'), validateCreatePlant, createPlant)

// ── ERP Equipment ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/equipment', authorize('masters.erp-equipment.view'), listErpEquipment)
ErpMastersRouter.post('/masters/equipment', authorize('masters.erp-equipment.create'), validateCreateErpEquipment, createErpEquipment)
ErpMastersRouter.patch('/masters/equipment/:id', authorize('masters.erp-equipment.update'), validateUpdateErpEquipment, patchErpEquipment)

// ── Microbial Strains ─────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/strains', authorize('masters.erp-strain.view'), listStrains)
ErpMastersRouter.post('/masters/strains', authorize('masters.erp-strain.create'), validateCreateStrain, createStrain)

// ── Customers ─────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/customers', authorize('masters.erp-customer.view'), listCustomers)
ErpMastersRouter.post('/masters/customers', authorize('masters.erp-customer.create'), validateCreateCustomer, createCustomer)

// ── Reason Codes ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/reason-codes', authorize('masters.erp-reason-code.view'), listReasonCodes)

export default ErpMastersRouter
