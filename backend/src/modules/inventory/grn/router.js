import express from 'express'
import { authenticate } from '../../../middleware/auth.js'
import { listGrn, getGrnDetail } from './get/grn.controller.js'
import { validateGrnDetailQuery } from './get/grn.middleware.js'

const GrnRouter = express.Router()

GrnRouter.get('/', authenticate, listGrn)
GrnRouter.get('/detail', authenticate, validateGrnDetailQuery, getGrnDetail)

export default GrnRouter
