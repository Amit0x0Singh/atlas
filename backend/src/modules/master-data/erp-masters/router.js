import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
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
import { updateItem, updateSupplier, patchErpEquipment } from './update/erp-masters.controller.js'
import { validateUpdateItem, validateUpdateSupplier, validateUpdateErpEquipment } from './update/erp-masters.middleware.js'

const ErpMastersRouter = express.Router()
const adminOnly   = authorize(['admin'])
const storeManager = authorize(['admin', 'store'])
const plannerPlus  = authorize(['admin', 'production'])

// ── ERP Items ─────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/items', authenticate, listItems)
ErpMastersRouter.get('/masters/items/:code', authenticate, getItem)
ErpMastersRouter.post('/masters/items', authenticate, storeManager, validateCreateItem, createItem)
ErpMastersRouter.put('/masters/items/:code', authenticate, storeManager, validateUpdateItem, updateItem)

// ── ERP Suppliers ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/suppliers', authenticate, listSuppliers)
ErpMastersRouter.post('/masters/suppliers', authenticate, storeManager, validateCreateSupplier, createSupplier)
ErpMastersRouter.put('/masters/suppliers/:id', authenticate, storeManager, validateUpdateSupplier, updateSupplier)

// ── ERP Plants ────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/plants', authenticate, listPlants)
ErpMastersRouter.post('/masters/plants', authenticate, adminOnly, validateCreatePlant, createPlant)

// ── ERP Equipment ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/equipment', authenticate, listErpEquipment)
ErpMastersRouter.post('/masters/equipment', authenticate, adminOnly, validateCreateErpEquipment, createErpEquipment)
ErpMastersRouter.patch('/masters/equipment/:id', authenticate, adminOnly, validateUpdateErpEquipment, patchErpEquipment)

// ── ERP Products ──────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/erp-products', authenticate, listErpProducts)
ErpMastersRouter.post('/masters/erp-products', authenticate, adminOnly, validateCreateErpProduct, createErpProduct)

// ── BOM ───────────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/bom', authenticate, plannerPlus, listBom)
ErpMastersRouter.get('/masters/bom/:id', authenticate, getBom)
ErpMastersRouter.post('/masters/bom', authenticate, authorize(['admin', 'production']), validateCreateBom, createBom)

// ── Microbial Strains ─────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/strains', authenticate, listStrains)
ErpMastersRouter.post('/masters/strains', authenticate, adminOnly, validateCreateStrain, createStrain)

// ── Customers ─────────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/customers', authenticate, listCustomers)
ErpMastersRouter.post('/masters/customers', authenticate, authorize(['admin', 'store']), validateCreateCustomer, createCustomer)

// ── Reason Codes ─────────────────────────────────────────────────────────────
ErpMastersRouter.get('/masters/reason-codes', authenticate, listReasonCodes)

// ── Containers (for decanting) ────────────────────────────────────────────────
ErpMastersRouter.get('/masters/containers', authenticate, listErpContainers)
ErpMastersRouter.post('/masters/containers', authenticate, storeManager, validateCreateErpContainer, createErpContainer)

export default ErpMastersRouter
