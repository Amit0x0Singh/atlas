import express from 'express'
import { listPublic } from './get/packing-items.controller.js'

// Mounted authenticate-only (no permission check) at the router.use() call
// site in routers.js — the Sales Order line-item form's Primary/Secondary
// Pack <datalist>s fetch from this, so it must be reachable by any logged-in
// user. Kept physically separate from admin-router.js so the admin/public
// boundary can't blur by accident (same convention as modules/options).
const PackingItemsPublicRouter = express.Router()

PackingItemsPublicRouter.get('/', listPublic)

export default PackingItemsPublicRouter
