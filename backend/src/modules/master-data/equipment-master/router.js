import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listEquipment } from './get/equipment-master.controller.js'
import { createEquipment } from './create/equipment-master.controller.js'
import { validateCreateEquipment } from './create/equipment-master.middleware.js'
import { updateEquipment } from './update/equipment-master.controller.js'
import { validateUpdateEquipment, validateEquipIdParam as validateUpdateEquipIdParam } from './update/equipment-master.middleware.js'
import { deleteEquipment } from './delete/equipment-master.controller.js'
import { validateEquipIdParam as validateDeleteEquipIdParam } from './delete/equipment-master.middleware.js'

const EquipmentMasterRouter = express.Router()
const adminOnly = authorize(['admin'])

EquipmentMasterRouter.get('/equipment', authenticate, listEquipment)
EquipmentMasterRouter.post('/equipment', authenticate, adminOnly, validateCreateEquipment, createEquipment)
EquipmentMasterRouter.put('/equipment/:equipId', authenticate, adminOnly, validateUpdateEquipIdParam, validateUpdateEquipment, updateEquipment)
EquipmentMasterRouter.delete('/equipment/:equipId', authenticate, adminOnly, validateDeleteEquipIdParam, deleteEquipment)

export default EquipmentMasterRouter
