import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listStock, listContainers, getItemStock, getRmHistory, getDashboardStats } from './get/stock.controller.js'

const StockRouter = express.Router()
const canView = authorize('inventory.stock.view')

StockRouter.get('/dashboard', canView, getDashboardStats)
StockRouter.get('/', canView, listStock)
StockRouter.get('/containers', canView, listContainers)
StockRouter.get('/rm/:itemCode/history', canView, getRmHistory)
StockRouter.get('/:itemCode', canView, getItemStock)

export default StockRouter
