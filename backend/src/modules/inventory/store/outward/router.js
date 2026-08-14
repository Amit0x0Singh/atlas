import express from 'express'
import { authorize } from '../../../../middleware/auth.js'
import { listOutward, getAvailablePacks, getPackDetail, listBomSessions } from './get/outward.controller.js'
import { bomScan, bomManual, packReduction, stockAdjustment, bagLossAdjustment, warehouseTransfer, directIssue, bomDirectIssue, upsertBomSession, deleteBomSession } from './create/outward.controller.js'
import {
  validateBomScan, validateBomManual, validatePackReduction, validateStockAdjustment,
  validateBagLossAdjustment, validateWarehouseTransfer, validateDirectIssue, validateBomDirectIssue,
} from './create/outward.middleware.js'

const OutwardRouter = express.Router()
const canView   = authorize('inventory.outward.view')
const canCreate = authorize('inventory.outward.create')

OutwardRouter.get('/', canView, listOutward)
OutwardRouter.get('/pack/:packId', canView, getPackDetail)
OutwardRouter.get('/available/:rmCode', canView, getAvailablePacks)
OutwardRouter.get('/bom-sessions', canView, listBomSessions)
OutwardRouter.put('/bom-sessions/:id', canCreate, upsertBomSession)
OutwardRouter.delete('/bom-sessions/:id', canCreate, deleteBomSession)
OutwardRouter.post('/bom-scan', canCreate, validateBomScan, bomScan)
OutwardRouter.post('/bom-manual', canCreate, validateBomManual, bomManual)
OutwardRouter.post('/pack-reduction', canCreate, validatePackReduction, packReduction)
// Inline stock-adjustment on this screen — distinct permission from the
// Adjustments module's approve/reject workflow (see inventory/adjustments).
OutwardRouter.post('/stock-adjustment', authorize('inventory.outward.adjust'), validateStockAdjustment, stockAdjustment)
OutwardRouter.post('/loss-adjustment', canCreate, validateBagLossAdjustment, bagLossAdjustment)
OutwardRouter.post('/warehouse-transfer', canCreate, validateWarehouseTransfer, warehouseTransfer)
OutwardRouter.post('/direct-issue', canCreate, validateDirectIssue, directIssue)
OutwardRouter.post('/bom-direct', canCreate, validateBomDirectIssue, bomDirectIssue)

export default OutwardRouter
