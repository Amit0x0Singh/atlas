import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listRm, getRm, listWarehouses } from './get/rm-master.controller.js'
import { createRm } from './create/rm-master.controller.js'
import { validateCreateRm } from './create/rm-master.middleware.js'
import { updateRm } from './update/rm-master.controller.js'
import { validateUpdateRm, validateItemCodeParam as validateUpdateItemCodeParam } from './update/rm-master.middleware.js'
import { deleteRm } from './delete/rm-master.controller.js'
import { validateItemCodeParam as validateDeleteItemCodeParam } from './delete/rm-master.middleware.js'

const RmRouter = express.Router()
const canView = authorize('masters.rm.view')

RmRouter.get('/', canView, listRm)
RmRouter.get('/warehouses', canView, listWarehouses)
RmRouter.get('/:itemCode', canView, getRm)
RmRouter.post('/', authorize('masters.rm.create'), validateCreateRm, createRm)
RmRouter.put('/:itemCode', authorize('masters.rm.update'), validateUpdateItemCodeParam, validateUpdateRm, updateRm)
RmRouter.delete('/:itemCode', authorize('masters.rm.delete'), validateDeleteItemCodeParam, deleteRm)

export default RmRouter
