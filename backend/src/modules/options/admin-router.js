import express from 'express'
import { listGroups, getGroup } from './get/options.controller.js'
import { createGroup, createValue } from './create/options.controller.js'
import { updateValue, setActive, reorderValues } from './update/options.controller.js'

// Mounted with adminOnly at the router.use() call site in routers.js — no
// auth middleware imported here, same convention as admin_panel/router.js.
// Deliberately no DELETE route anywhere — deactivation (setActive) is the
// only "removal" path, enforced structurally rather than by frontend
// discipline (see the "never hard-delete" requirement).
const OptionsAdminRouter = express.Router()

OptionsAdminRouter.get('/groups', listGroups)
OptionsAdminRouter.post('/groups', createGroup)
OptionsAdminRouter.get('/groups/:groupCode', getGroup)
OptionsAdminRouter.post('/groups/:groupCode/values', createValue)
OptionsAdminRouter.post('/groups/:groupCode/reorder', reorderValues)
OptionsAdminRouter.put('/values/:id', updateValue)
OptionsAdminRouter.patch('/values/:id/active', setActive)

export default OptionsAdminRouter
