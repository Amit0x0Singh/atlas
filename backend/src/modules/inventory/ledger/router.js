import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listLedger, getLedgerByItem, getLedgerEntry } from './get/ledger.controller.js'

const LedgerRouter = express.Router()
const canView = authorize('inventory.ledger.view')

LedgerRouter.get('/', canView, listLedger)
LedgerRouter.get('/item/:itemCode', canView, getLedgerByItem)
LedgerRouter.get('/:id', canView, getLedgerEntry)

export default LedgerRouter
