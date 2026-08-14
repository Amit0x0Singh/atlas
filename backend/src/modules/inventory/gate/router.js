import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { createGateInward, createGateOutward, createManualGateInward } from './create/gate.controller.js'
import { validateGateInward, validateGateOutward, validateManualGateInward } from './create/gate.middleware.js'
import { listGateInward, getGateInward, listGateOutward, getGateOutward } from './get/gate.controller.js'
import { validateGateListQuery, validateGateIdParam as validateGetIdParam } from './get/gate.middleware.js'
import { updateGateInwardStatus, updateGateOutwardStatus, requestDeleteGateInward, requestDeleteGateOutward } from './update/gate.controller.js'
import { validateStatusUpdate, validateIdParam as validateUpdateIdParam } from './update/gate.middleware.js'
import { deleteGateInward, deleteGateOutward } from './delete/gate.controller.js'
import { validateGateIdParam as validateDeleteIdParam } from './delete/gate.middleware.js'

const GateRouter = express.Router()

// Store flips a Gate Inward to 'approved' right after generating Print
// Master packs from it (both the linked-entry and manual-entry flows) — so
// gate.inward.create/.update are granted to the Store Manager role too (see
// roles.seed.js), unlike outward, which stays gate-only.
const inwardStatusRoles = authorize(['gate.inward.update'])

// ── Gate Inward ───────────────────────────────────────────────────────────────
GateRouter.post('/inward',                      authorize('gate.inward.create'), validateGateInward,  createGateInward)
GateRouter.post('/inward/manual',               authorize('gate.inward.create'), validateManualGateInward, createManualGateInward)
GateRouter.get('/inward',                       authorize('gate.inward.view'),   validateGateListQuery, listGateInward)
GateRouter.get('/inward/:id',                   authorize('gate.inward.view'),   validateGetIdParam,  getGateInward)
GateRouter.patch('/inward/:id/status',          inwardStatusRoles, validateUpdateIdParam, validateStatusUpdate, updateGateInwardStatus)
GateRouter.patch('/inward/:id/request-delete',  authorize('gate.inward.update'), validateUpdateIdParam, requestDeleteGateInward)
GateRouter.delete('/inward/:id',                authorize('gate.inward.delete'), validateDeleteIdParam, deleteGateInward)

// ── Gate Outward ──────────────────────────────────────────────────────────────
GateRouter.post('/outward',                      authorize('gate.outward.create'), validateGateOutward, createGateOutward)
GateRouter.get('/outward',                       authorize('gate.outward.view'),   validateGateListQuery, listGateOutward)
GateRouter.get('/outward/:id',                   authorize('gate.outward.view'),   validateGetIdParam,  getGateOutward)
GateRouter.patch('/outward/:id/status',          authorize('gate.outward.update'), validateUpdateIdParam, validateStatusUpdate, updateGateOutwardStatus)
GateRouter.patch('/outward/:id/request-delete',  authorize('gate.outward.update'), validateUpdateIdParam, requestDeleteGateOutward)
GateRouter.delete('/outward/:id',                authorize('gate.outward.delete'), validateDeleteIdParam, deleteGateOutward)

export default GateRouter
