import express from 'express'
import { authorize, authenticate } from '../../../middleware/auth.js'
import { listEquipment, listEquipmentFilterMeta } from './get/equipment-master.controller.js'
import { validateEquipmentListQuery } from './get/equipment-master.middleware.js'
import { createEquipment } from './create/equipment-master.controller.js'
import { validateCreateEquipment } from './create/equipment-master.middleware.js'
import { updateEquipment } from './update/equipment-master.controller.js'
import { validateUpdateEquipment, validateEquipIdParam as validateUpdateEquipIdParam } from './update/equipment-master.middleware.js'
import { deleteEquipment } from './delete/equipment-master.controller.js'
import { validateEquipIdParam as validateDeleteEquipIdParam } from './delete/equipment-master.middleware.js'

const EquipmentMasterRouter = express.Router()
const canView = authorize('masters.equipment.view')

EquipmentMasterRouter.get('/equipment/meta/filters', canView, listEquipmentFilterMeta)
// Any logged-in user can look equipment up by name to power a picker
// elsewhere (Production Indent) — a lookup needed to fill out a form they
// already have permission for, not a request to browse Equipment Master.
EquipmentMasterRouter.get('/equipment/search', authenticate, validateEquipmentListQuery, listEquipment)
EquipmentMasterRouter.get('/equipment', canView, validateEquipmentListQuery, listEquipment)
EquipmentMasterRouter.post('/equipment', authorize('masters.equipment.create'), validateCreateEquipment, createEquipment)
EquipmentMasterRouter.put('/equipment/:equipId', authorize('masters.equipment.update'), validateUpdateEquipIdParam, validateUpdateEquipment, updateEquipment)
EquipmentMasterRouter.delete('/equipment/:equipId', authorize('masters.equipment.delete'), validateDeleteEquipIdParam, deleteEquipment)

export default EquipmentMasterRouter
