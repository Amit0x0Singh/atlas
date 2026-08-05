import express from 'express'
import { authenticate, authorize } from '../../middleware/auth.js'
import ProductMasterRouter from './product-master/router.js'
import EquipmentMasterRouter from './equipment-master/router.js'
import ErpMastersRouter from './erp-masters/router.js'

const MasterDataRouter = express.Router()

// Note: RM Master ('/rm') is served by inventory/row-material-master's
// router (mounted earlier in routers.js) — a duplicate './rm-master' tree
// here was removed as dead/unreachable code, see git history if needed.
MasterDataRouter.use('/', ProductMasterRouter)
MasterDataRouter.use('/', EquipmentMasterRouter)
MasterDataRouter.use('/', ErpMastersRouter)

export default MasterDataRouter
