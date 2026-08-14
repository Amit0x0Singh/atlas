import express from 'express'
import { listPublicValues } from './get/options.controller.js'

// Mounted with authenticate-only (no adminOnly) at the router.use() call
// site in routers.js — this is what every retrofitted <select> across the
// app fetches from, so it must be reachable by any logged-in user, not just
// admins. Kept as a physically separate router file from admin-router.js so
// the admin/public boundary can't blur by accident.
const OptionsPublicRouter = express.Router()

OptionsPublicRouter.get('/:groupCode', listPublicValues)

export default OptionsPublicRouter
