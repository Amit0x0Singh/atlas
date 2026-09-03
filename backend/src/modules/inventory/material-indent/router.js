import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listIndents, getIndent } from './get/material-indent.controller.js'
import { createIndent, updateIndent } from './create/material-indent.controller.js'
import { issueLine, rejectIndent, rejectLine, cancelIndent } from './issue/material-indent.controller.js'

const MaterialIndentRouter = express.Router()

// Raising a Material Indent is open to every authenticated employee — each
// plant/section person needs to request general/daily-use items from the
// Store, regardless of which role they hold. Submitting still requires a
// department on the account (see resolveDepartment).
const canView   = authorize([])
const canCreate = authorize([])
// Issuing / rejecting an indent line is a Store-Outward action — anyone who
// can issue store outward (`inventory.outward.create`) can work the Open
// Indents queue, alongside the dedicated `inventory.material-indent.issue`
// grant and admins. Keeping it tied to the broader outward permission means
// a custom "Stores" role doesn't silently lose access to this workflow.
const canIssue  = authorize(['inventory.material-indent.issue', 'inventory.outward.create', 'admin.panel.access'])

MaterialIndentRouter.get('/', canView, listIndents)
MaterialIndentRouter.get('/:id', canView, getIndent)

MaterialIndentRouter.post('/', canCreate, createIndent)
MaterialIndentRouter.put('/:id', canCreate, updateIndent)
MaterialIndentRouter.patch('/:id/cancel', canCreate, cancelIndent)

MaterialIndentRouter.post('/:id/issue', canIssue, issueLine)
MaterialIndentRouter.patch('/:id/reject', canIssue, rejectIndent)
MaterialIndentRouter.patch('/:id/items/:itemId/reject', canIssue, rejectLine)

export default MaterialIndentRouter
