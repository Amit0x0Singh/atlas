import express from 'express'
import { authenticate } from '../../../middleware/auth.js'
import { listLedger, getLedgerByItem, getLedgerEntry, getLedgerMeta } from './get/ledger.controller.js'
import { validateLedgerListQuery } from './get/ledger.middleware.js'

const LedgerRouter = express.Router()

// Registered before the /:id catch-all so "meta" isn't swallowed as an id.
LedgerRouter.get('/meta/transaction-types', authenticate, getLedgerMeta)
LedgerRouter.get('/', authenticate, validateLedgerListQuery, listLedger)
LedgerRouter.get('/item/:itemCode', authenticate, getLedgerByItem)
LedgerRouter.get('/:id', authenticate, getLedgerEntry)

export default LedgerRouter
