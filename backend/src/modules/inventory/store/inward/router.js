import express from 'express'
import { authorize } from '../../../../middleware/auth.js'
import {
  getPendingInwardGroups, getNextLotNumber, listPacks, getPackById,
  getPackLabel, getBatchLabels, generatePacks,
  listInward, listActiveSessions, getSession
} from './get/inward.controller.js'
import { scanPack, batchScanPack, submitLot } from './create/inward.controller.js'
import { validateLotParams, validateScanPack, validateBatchScanPack } from './create/inward.middleware.js'
import { removeScan } from './delete/inward.controller.js'

const InwardRouter = express.Router()
const canView   = authorize('inventory.inward.view')
const canCreate = authorize('inventory.inward.create')
const canDelete = authorize('inventory.inward.delete')

// ── Pack / Print Master ────────────────────────────────────────────────────────
InwardRouter.get('/packs/pending-inward', canView, getPendingInwardGroups)
InwardRouter.get('/packs/next-lot/:itemCode', canView, getNextLotNumber)
// Label printing needs only the same view permission as the parent resource.
InwardRouter.get('/packs/label/:packId', canView, getPackLabel)
InwardRouter.get('/packs/labels/lot/:itemCode/:lotNo', canView, getBatchLabels)
InwardRouter.get('/packs/:packId', canView, getPackById)
InwardRouter.get('/packs', canView, listPacks)
InwardRouter.post('/packs/generate', canCreate, generatePacks)

// ── Inward records ─────────────────────────────────────────────────────────────
// Scan/submit are scoped by (itemCode, lotNo) — i.e. one Print Master header
// — instead of a separately-created session id; scan progress lives on each
// PackDetail row's status, so there's nothing to "create" before scanning.
InwardRouter.get('/inward', canView, listInward)
InwardRouter.get('/inward/lots/in-progress', canView, listActiveSessions)
InwardRouter.get('/inward/lots/:itemCode/:lotNo', canView, validateLotParams, getSession)
InwardRouter.post('/inward/lots/:itemCode/:lotNo/scan', canCreate, validateLotParams, validateScanPack, scanPack)
InwardRouter.post('/inward/lots/:itemCode/:lotNo/batch-scan', canCreate, validateLotParams, validateBatchScanPack, batchScanPack)
InwardRouter.delete('/inward/lots/:itemCode/:lotNo/scan/:packId', canDelete, validateLotParams, removeScan)
InwardRouter.post('/inward/lots/:itemCode/:lotNo/submit', canCreate, validateLotParams, submitLot)

export default InwardRouter
