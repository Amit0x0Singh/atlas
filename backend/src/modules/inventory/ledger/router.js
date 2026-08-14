import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listLedger, getLedgerByItem, getLedgerEntry, getLedgerMeta } from './get/ledger.controller.js'
import { validateLedgerListQuery } from './get/ledger.middleware.js'

const LedgerRouter = express.Router()
const canView = authorize('inventory.ledger.view')

// Registered before the /:id catch-all so "meta" isn't swallowed as an id.
LedgerRouter.get('/meta/transaction-types', canView, getLedgerMeta)
LedgerRouter.get('/', canView, validateLedgerListQuery, listLedger)
LedgerRouter.get('/item/:itemCode', canView, getLedgerByItem)
LedgerRouter.get('/:id', canView, getLedgerEntry)

export default LedgerRouter
