import express from 'express'
import { authorize } from '../../middleware/auth.js'
import { listAdmin } from './get/packing-items.controller.js'
import { createItem } from './create/packing-items.controller.js'
import { updateItem, setActive } from './update/packing-items.controller.js'

// Same gating convention as modules/options/admin-router.js: reads need only
// admin.settings.access (view the Settings screen), writes need
// admin.settings.manage. No new permission key — Packing Items is managed on
// the same Settings page as the Select Options groups.
// Deliberately no DELETE route — deactivation (setActive) is the only
// "removal" path, enforced structurally.
const PackingItemsAdminRouter = express.Router()

const canAccess = authorize('admin.settings.access')
const canManage = authorize('admin.settings.manage')

PackingItemsAdminRouter.get('/', canAccess, listAdmin)
PackingItemsAdminRouter.post('/', canManage, createItem)
PackingItemsAdminRouter.put('/:id', canManage, updateItem)
PackingItemsAdminRouter.patch('/:id/active', canManage, setActive)

export default PackingItemsAdminRouter
