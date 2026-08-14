import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listPackingMaterials } from './get/packing-master.controller.js'
import { createPackingMaterial } from './create/packing-master.controller.js'
import { validateCreatePackingMaterial } from './create/packing-master.middleware.js'
import { updatePackingMaterial } from './update/packing-master.controller.js'
import { validateUpdatePackingMaterial, validatePackingIdParam as validateUpdateIdParam } from './update/packing-master.middleware.js'
import { deletePackingMaterial } from './delete/packing-master.controller.js'
import { validatePackingIdParam as validateDeleteIdParam } from './delete/packing-master.middleware.js'

const PackingMasterRouter = express.Router()

PackingMasterRouter.get('/packing-materials', authorize('masters.packing.view'), listPackingMaterials)
PackingMasterRouter.post('/packing-materials', authorize('masters.packing.create'), validateCreatePackingMaterial, createPackingMaterial)
PackingMasterRouter.put('/packing-materials/:id', authorize('masters.packing.update'), validateUpdateIdParam, validateUpdatePackingMaterial, updatePackingMaterial)
PackingMasterRouter.delete('/packing-materials/:id', authorize('masters.packing.delete'), validateDeleteIdParam, deletePackingMaterial)

export default PackingMasterRouter
