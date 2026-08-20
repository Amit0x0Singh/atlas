import express from 'express'
import multer from 'multer'
import path from 'path'
import { authorize } from '../../../middleware/auth.js'
import { createGateInward, createGateOutward, createManualGateInward } from './create/gate.controller.js'
import { validateGateInward, validateGateOutward, validateManualGateInward } from './create/gate.middleware.js'
import { listGateInward, getGateInward, listGateOutward, getGateOutward } from './get/gate.controller.js'
import { validateGateListQuery, validateGateIdParam as validateGetIdParam } from './get/gate.middleware.js'
import { updateGateInward, updateGateOutward, updateGateInwardStatus, updateGateOutwardStatus, requestDeleteGateInward, requestDeleteGateOutward } from './update/gate.controller.js'
import { validateStatusUpdate, validateIdParam as validateUpdateIdParam } from './update/gate.middleware.js'
import { deleteGateInward, deleteGateOutward } from './delete/gate.controller.js'
import { validateGateIdParam as validateDeleteIdParam } from './delete/gate.middleware.js'
import {
  uploadGateInwardInvoiceDocument, viewGateInwardInvoiceDocument,
  uploadGateOutwardInvoiceDocument, viewGateOutwardInvoiceDocument,
} from './document/gate.controller.js'
import { GATE_INWARD_INVOICES_DIR, GATE_OUTWARD_INVOICES_DIR, ensureGateStorageDirs } from './utils/storage-paths.js'

ensureGateStorageDirs()

const invoiceDocFileFilter = (req, file, cb) => {
  const extOk = /\.(pdf|jpe?g|png)$/i.test(file.originalname)
  const mimeOk = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)
  cb(null, extOk && mimeOk)
}

// Disk-storage multer instance for the invoice document upload — mirrors
// backend/src/modules/backup/router.js's restoreUpload pattern.
const invoiceDocUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, GATE_INWARD_INVOICES_DIR),
    // Keyed by the gate inward id so a re-upload's old file is easy to spot
    // on disk, and path.basename strips any directory component out of the
    // client-supplied name (same traversal guard as restoreUpload).
    filename: (req, file, cb) => cb(null, `${req.params.id}-${Date.now()}${path.extname(path.basename(file.originalname))}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: invoiceDocFileFilter,
})

// Same shape as invoiceDocUpload, keyed by outward id, writing to its own
// storage dir — a multer disk-storage instance's destination is fixed at
// construction, so inward and outward each need their own instance.
const outwardInvoiceDocUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, GATE_OUTWARD_INVOICES_DIR),
    filename: (req, file, cb) => cb(null, `${req.params.id}-${Date.now()}${path.extname(path.basename(file.originalname))}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: invoiceDocFileFilter,
})

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
GateRouter.patch('/inward/:id',                 authorize('gate.inward.update'), validateUpdateIdParam, validateGateInward, updateGateInward)
GateRouter.patch('/inward/:id/status',          inwardStatusRoles, validateUpdateIdParam, validateStatusUpdate, updateGateInwardStatus)
GateRouter.patch('/inward/:id/request-delete',  authorize('gate.inward.update'), validateUpdateIdParam, requestDeleteGateInward)
GateRouter.delete('/inward/:id',                authorize('gate.inward.delete'), validateDeleteIdParam, deleteGateInward)
GateRouter.post('/inward/:id/invoice-document', authorize(['gate.inward.create', 'gate.inward.update']), validateUpdateIdParam, invoiceDocUpload.single('file'), uploadGateInwardInvoiceDocument)
GateRouter.get('/inward/:id/invoice-document',  authorize('gate.inward.view'),   validateGetIdParam, viewGateInwardInvoiceDocument)

// ── Gate Outward ──────────────────────────────────────────────────────────────
GateRouter.post('/outward',                      authorize('gate.outward.create'), validateGateOutward, createGateOutward)
GateRouter.get('/outward',                       authorize('gate.outward.view'),   validateGateListQuery, listGateOutward)
GateRouter.get('/outward/:id',                   authorize('gate.outward.view'),   validateGetIdParam,  getGateOutward)
GateRouter.patch('/outward/:id',                 authorize('gate.outward.update'), validateUpdateIdParam, validateGateOutward, updateGateOutward)
GateRouter.patch('/outward/:id/status',          authorize('gate.outward.update'), validateUpdateIdParam, validateStatusUpdate, updateGateOutwardStatus)
GateRouter.patch('/outward/:id/request-delete',  authorize('gate.outward.update'), validateUpdateIdParam, requestDeleteGateOutward)
GateRouter.delete('/outward/:id',                authorize('gate.outward.delete'), validateDeleteIdParam, deleteGateOutward)
GateRouter.post('/outward/:id/invoice-document', authorize(['gate.outward.create', 'gate.outward.update']), validateUpdateIdParam, outwardInvoiceDocUpload.single('file'), uploadGateOutwardInvoiceDocument)
GateRouter.get('/outward/:id/invoice-document',  authorize('gate.outward.view'),   validateGetIdParam, viewGateOutwardInvoiceDocument)

export default GateRouter
