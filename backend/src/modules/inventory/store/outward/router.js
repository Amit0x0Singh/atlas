import express from 'express'
import { authenticate, authorize } from '../../../../middleware/auth.js'
import { listOutward, getAvailablePacks, getPackDetail, listBomSessions } from './get/outward.controller.js'
import { bomScan, bomManual, packReduction, stockAdjustment, bagLossAdjustment, warehouseTransfer, directIssue, bomDirectIssue, upsertBomSession, deleteBomSession } from './create/outward.controller.js'
import {
  validateBomScan, validateBomManual, validatePackReduction, validateStockAdjustment,
  validateBagLossAdjustment, validateWarehouseTransfer, validateDirectIssue, validateBomDirectIssue,
} from './create/outward.middleware.js'

const OutwardRouter = express.Router()
const storeOrAbove = authorize(['store'])
const managerOrAbove = authorize(['store'])

OutwardRouter.get('/', authenticate, listOutward)
OutwardRouter.get('/pack/:packId', authenticate, getPackDetail)
OutwardRouter.get('/available/:rmCode', authenticate, getAvailablePacks)
OutwardRouter.get('/bom-sessions', authenticate, listBomSessions)
OutwardRouter.put('/bom-sessions/:id', authenticate, storeOrAbove, upsertBomSession)
OutwardRouter.delete('/bom-sessions/:id', authenticate, storeOrAbove, deleteBomSession)
OutwardRouter.post('/bom-scan', authenticate, storeOrAbove, validateBomScan, bomScan)
OutwardRouter.post('/bom-manual', authenticate, storeOrAbove, validateBomManual, bomManual)
OutwardRouter.post('/pack-reduction', authenticate, storeOrAbove, validatePackReduction, packReduction)
OutwardRouter.post('/stock-adjustment', authenticate, managerOrAbove, validateStockAdjustment, stockAdjustment)
OutwardRouter.post('/loss-adjustment', authenticate, storeOrAbove, validateBagLossAdjustment, bagLossAdjustment)
OutwardRouter.post('/warehouse-transfer', authenticate, storeOrAbove, validateWarehouseTransfer, warehouseTransfer)
OutwardRouter.post('/direct-issue', authenticate, storeOrAbove, validateDirectIssue, directIssue)
OutwardRouter.post('/bom-direct', authenticate, storeOrAbove, validateBomDirectIssue, bomDirectIssue)

export default OutwardRouter
