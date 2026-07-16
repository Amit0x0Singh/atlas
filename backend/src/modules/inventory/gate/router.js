import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { createGateInward, createGateOutward } from './create/gate.controller.js'
import { validateGateInward, validateGateOutward } from './create/gate.middleware.js'
import { listGateInward, getGateInward, listGateOutward, getGateOutward } from './get/gate.controller.js'
import { validateGateListQuery, validateGateIdParam as validateGetIdParam } from './get/gate.middleware.js'
import { updateGateInwardStatus, updateGateOutwardStatus, requestDeleteGateInward, requestDeleteGateOutward } from './update/gate.controller.js'
import { validateStatusUpdate, validateIdParam as validateUpdateIdParam } from './update/gate.middleware.js'
import { deleteGateInward, deleteGateOutward } from './delete/gate.controller.js'
import { validateGateIdParam as validateDeleteIdParam } from './delete/gate.middleware.js'

const GateRouter = express.Router()

// authorize() already calls authenticate() internally — no need for both
const gateOrAbove    = authorize(['gate'])
const managerOrAbove = authorize(['gate'])

// ── Gate Inward ───────────────────────────────────────────────────────────────
GateRouter.post('/inward',                      gateOrAbove,    validateGateInward,  createGateInward)  // create inward record
GateRouter.get('/inward',                       authenticate,   validateGateListQuery, listGateInward)    // get list of records
GateRouter.get('/inward/:id',                   authenticate,   validateGetIdParam,  getGateInward)     // get one recode by Id
GateRouter.patch('/inward/:id/status',          managerOrAbove, validateUpdateIdParam, validateStatusUpdate, updateGateInwardStatus) // update ineward status
GateRouter.patch('/inward/:id/request-delete',  gateOrAbove,    validateUpdateIdParam, requestDeleteGateInward)  // send request for delete inward records by gate person
GateRouter.delete('/inward/:id',                managerOrAbove, validateDeleteIdParam, deleteGateInward)  // delete record by admin user

// ── Gate Outward ──────────────────────────────────────────────────────────────
GateRouter.post('/outward',                      gateOrAbove,    validateGateOutward, createGateOutward) // create inward record
GateRouter.get('/outward',                       authenticate,   validateGateListQuery, listGateOutward)   // get list of records
GateRouter.get('/outward/:id',                   authenticate,   validateGetIdParam,  getGateOutward)    // get one recode by Id
GateRouter.patch('/outward/:id/status',          managerOrAbove, validateUpdateIdParam, validateStatusUpdate, updateGateOutwardStatus)  // update ineward status
GateRouter.patch('/outward/:id/request-delete',  gateOrAbove,    validateUpdateIdParam, requestDeleteGateOutward)  // send request for delete inward records by gate person
GateRouter.delete('/outward/:id',                managerOrAbove, validateDeleteIdParam, deleteGateOutward)  // delete record by admin user


export default GateRouter
