/**
 * Stock Ledger › Get — Local Middleware
 * Validates list-filter query params for GET /api/ledger. All filters are
 * optional — only checked for shape when actually present.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { TRANSACTION_TYPES } from '../../../../utils/ledger-transaction-types.js'

export const validateLedgerListQuery = preprocess({
  target: 'query',
  schema: {
    itemCode:        { maxLength: 50 },
    search:          { maxLength: 150 },
    transactionType: { enum: TRANSACTION_TYPES.map(t => t.value) },
    reference:       { maxLength: 200 },
    warehouse:       { maxLength: 100 },
    direction:       { enum: ['IN', 'OUT'] },
  },
})
