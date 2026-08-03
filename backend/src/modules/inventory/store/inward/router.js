import express from 'express'
import { authenticate, authorize } from '../../../../middleware/auth.js'
import {
  getPendingInwardGroups, getNextLotNumber, listPacks, getPackById,
  getPackLabel, getBatchLabels, generatePacks,
  listInward, listActiveSessions, getSession
} from './get/inward.controller.js'
import { scanPack, batchScanPack, submitLot } from './create/inward.controller.js'
import { validateLotParams, validateScanPack, validateBatchScanPack } from './create/inward.middleware.js'
import { removeScan } from './delete/inward.controller.js'

const InwardRouter = express.Router()
const storeOrAbove = authorize(['store'])

// ── Pack / Print Master ────────────────────────────────────────────────────────
InwardRouter.get('/packs/pending-inward', authenticate, getPendingInwardGroups)
InwardRouter.get('/packs/next-lot/:itemCode', authenticate, getNextLotNumber)
InwardRouter.get('/packs/label/:packId', getPackLabel)
InwardRouter.get('/packs/labels/lot/:itemCode/:lotNo', getBatchLabels)
InwardRouter.get('/packs/:packId', authenticate, getPackById)
InwardRouter.get('/packs', authenticate, listPacks)
InwardRouter.post('/packs/generate', authenticate, storeOrAbove, generatePacks)

// ── Inward records ─────────────────────────────────────────────────────────────
// Scan/submit are scoped by (itemCode, lotNo) — i.e. one Print Master header
// — instead of a separately-created session id; scan progress lives on each
// PackDetail row's status, so there's nothing to "create" before scanning.
InwardRouter.get('/inward', authenticate, listInward)
InwardRouter.get('/inward/lots/in-progress', authenticate, listActiveSessions)
InwardRouter.get('/inward/lots/:itemCode/:lotNo', authenticate, validateLotParams, getSession)
InwardRouter.post('/inward/lots/:itemCode/:lotNo/scan', authenticate, storeOrAbove, validateLotParams, validateScanPack, scanPack)
InwardRouter.post('/inward/lots/:itemCode/:lotNo/batch-scan', authenticate, storeOrAbove, validateLotParams, validateBatchScanPack, batchScanPack)
InwardRouter.delete('/inward/lots/:itemCode/:lotNo/scan/:packId', authenticate, storeOrAbove, validateLotParams, removeScan)
InwardRouter.post('/inward/lots/:itemCode/:lotNo/submit', authenticate, storeOrAbove, validateLotParams, submitLot)

export default InwardRouter
