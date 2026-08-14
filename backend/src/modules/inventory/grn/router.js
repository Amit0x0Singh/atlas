import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listGrn, getGrnDetail } from './get/grn.controller.js'
import { validateGrnDetailQuery } from './get/grn.middleware.js'

const GrnRouter = express.Router()
const canView = authorize('inventory.grn.view')

GrnRouter.get('/', canView, listGrn)
GrnRouter.get('/detail', canView, validateGrnDetailQuery, getGrnDetail)

export default GrnRouter
