import express from 'express'
import { authorize, authenticate } from '../../../middleware/auth.js'
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
// Any logged-in user can look items up by name/code to power an autosuggest
// field elsewhere (Gate/Print Master/Store/Recipe/Production forms) — that's
// a lookup needed to fill out a form they already have permission for, not
// a request to browse the Item Master screen itself, so it isn't gated by
// masters.rm.view. Must come before /:itemCode or "search" would be read as
// an item code.
RmRouter.get('/search', authenticate, listRm)
RmRouter.get('/:itemCode', canView, getRm)
RmRouter.post('/', authorize('masters.rm.create'), validateCreateRm, createRm)
RmRouter.put('/:itemCode', authorize('masters.rm.update'), validateUpdateItemCodeParam, validateUpdateRm, updateRm)
RmRouter.delete('/:itemCode', authorize('masters.rm.delete'), validateDeleteItemCodeParam, deleteRm)

export default RmRouter
