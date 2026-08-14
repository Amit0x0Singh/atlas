import express from 'express'
import { authorize } from '../../middleware/auth.js'
import { listGroups, getGroup } from './get/options.controller.js'
import { createGroup, createValue } from './create/options.controller.js'
import { updateValue, setActive, reorderValues } from './update/options.controller.js'

// Per-route gating (same convention as modules/admin/rbac/router.js): reads
// need only admin.settings.access (view the screen), writes need
// admin.settings.manage — so a future view-only role isn't 403'd on load.
// Deliberately no DELETE route anywhere — deactivation (setActive) is the
// only "removal" path, enforced structurally rather than by frontend
// discipline (see the "never hard-delete" requirement).
const OptionsAdminRouter = express.Router()

const canAccess = authorize('admin.settings.access')
const canManage = authorize('admin.settings.manage')

OptionsAdminRouter.get('/groups', canAccess, listGroups)
OptionsAdminRouter.post('/groups', canManage, createGroup)
OptionsAdminRouter.get('/groups/:groupCode', canAccess, getGroup)
OptionsAdminRouter.post('/groups/:groupCode/values', canManage, createValue)
OptionsAdminRouter.post('/groups/:groupCode/reorder', canManage, reorderValues)
OptionsAdminRouter.put('/values/:id', canManage, updateValue)
OptionsAdminRouter.patch('/values/:id/active', canManage, setActive)

export default OptionsAdminRouter
