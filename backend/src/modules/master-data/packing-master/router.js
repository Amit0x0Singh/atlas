import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listPackingMaterials } from './get/packing-master.controller.js'
import { createPackingMaterial } from './create/packing-master.controller.js'
import { validateCreatePackingMaterial } from './create/packing-master.middleware.js'
import { updatePackingMaterial } from './update/packing-master.controller.js'
import { validateUpdatePackingMaterial, validatePackingIdParam as validateUpdateIdParam } from './update/packing-master.middleware.js'
import { deletePackingMaterial } from './delete/packing-master.controller.js'
import { validatePackingIdParam as validateDeleteIdParam } from './delete/packing-master.middleware.js'

const PackingMasterRouter = express.Router()
const adminOnly    = authorize(['admin'])

PackingMasterRouter.get('/packing-materials', authenticate, listPackingMaterials)
PackingMasterRouter.post('/packing-materials', authenticate, adminOnly, validateCreatePackingMaterial, createPackingMaterial)
PackingMasterRouter.put('/packing-materials/:id', authenticate, adminOnly, validateUpdateIdParam, validateUpdatePackingMaterial, updatePackingMaterial)
PackingMasterRouter.delete('/packing-materials/:id', authenticate, adminOnly, validateDeleteIdParam, deletePackingMaterial)

export default PackingMasterRouter
