import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listRm, getRm, listWarehouses } from './get/rm-master.controller.js'
import { createRm } from './create/rm-master.controller.js'
import { validateCreateRm } from './create/rm-master.middleware.js'
import { updateRm } from './update/rm-master.controller.js'
import { validateUpdateRm, validateItemCodeParam as validateUpdateItemCodeParam } from './update/rm-master.middleware.js'
import { deleteRm } from './delete/rm-master.controller.js'
import { validateItemCodeParam as validateDeleteItemCodeParam } from './delete/rm-master.middleware.js'

const RmRouter = express.Router()
const managerOrAbove = authorize(['admin'])

RmRouter.get('/', authenticate, listRm)
RmRouter.get('/warehouses', authenticate, listWarehouses)
RmRouter.get('/:itemCode', authenticate, getRm)
RmRouter.post('/', authenticate, managerOrAbove, validateCreateRm, createRm)
RmRouter.put('/:itemCode', authenticate, managerOrAbove, validateUpdateItemCodeParam, validateUpdateRm, updateRm)
RmRouter.delete('/:itemCode', authenticate, managerOrAbove, validateDeleteItemCodeParam, deleteRm)

export default RmRouter
