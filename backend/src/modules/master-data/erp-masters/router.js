import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import {
  listItems, getItem, listSuppliers, listPlants, listErpEquipment,
  listErpProducts, listBom, getBom, listStrains, listCustomers,
  listReasonCodes, listErpContainers,
} from './get/erp-masters.controller.js'
import {
  createItem, createSupplier, createPlant, createErpEquipment,
  createErpProduct, createBom, createStrain, createCustomer, createErpContainer,
} from './create/erp-masters.controller.js'
import {
  validateCreateItem, validateCreateSupplier, validateCreatePlant, validateCreateErpEquipment,
  validateCreateErpProduct, validateCreateBom, validateCreateStrain, validateCreateCustomer, validateCreateErpContainer,
} from './create/erp-masters.middleware.js'
import { validateSupplierListQuery } from './get/erp-masters.middleware.js'
import { updateItem, updateSupplier, patchErpEquipment } from './update/erp-masters.controller.js'
import { validateUpdateItem, validateUpdateSupplier, validateUpdateErpEquipment } from './update/erp-masters.middleware.js'

const ErpMastersRouter = express.Router()

// ── ERP Items ─────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/items', authorize('masters.erp-item.view'), listItems)
ErpMastersRouter.get('/masters/items/:code', authorize('masters.erp-item.view'), getItem)
ErpMastersRouter.post('/masters/items', authorize('masters.erp-item.create'), validateCreateItem, createItem)
ErpMastersRouter.put('/masters/items/:code', authorize('masters.erp-item.update'), validateUpdateItem, updateItem)

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

// ── ERP Products ──────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/erp-products', authorize('masters.erp-product.view'), listErpProducts)
ErpMastersRouter.post('/masters/erp-products', authorize('masters.erp-product.create'), validateCreateErpProduct, createErpProduct)

// ── BOM ───────────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/bom', authorize('masters.erp-bom.view'), listBom)
ErpMastersRouter.get('/masters/bom/:id', authorize('masters.erp-bom.view'), getBom)
ErpMastersRouter.post('/masters/bom', authorize('masters.erp-bom.create'), validateCreateBom, createBom)

// ── Microbial Strains ─────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/strains', authorize('masters.erp-strain.view'), listStrains)
ErpMastersRouter.post('/masters/strains', authorize('masters.erp-strain.create'), validateCreateStrain, createStrain)

// ── Customers ─────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/customers', authorize('masters.erp-customer.view'), listCustomers)
ErpMastersRouter.post('/masters/customers', authorize('masters.erp-customer.create'), validateCreateCustomer, createCustomer)

// ── Reason Codes ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/reason-codes', authorize('masters.erp-reason-code.view'), listReasonCodes)

// ── Containers (for decanting) ────────────────────────────────────────────────
ErpMastersRouter.get('/masters/containers', authorize('masters.erp-container.view'), listErpContainers)
ErpMastersRouter.post('/masters/containers', authorize('masters.erp-container.create'), validateCreateErpContainer, createErpContainer)

export default ErpMastersRouter
