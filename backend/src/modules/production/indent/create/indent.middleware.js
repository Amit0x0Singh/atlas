import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { isNonEmptyArray } from '../../../../middleware/validators/common.js'

// POST /indent — createIndent
// productCode/productName/batchNo/diNo/batchSize are the controller's own
// explicit 400 check (`if (!productCode || ...)`) — moved up here, plus a
// well-formedness check on batchSize/cycleBatchSize before they reach
// parseFloat (used directly in stock-requirement math and the created
// IndentMaster/IndentDetails rows).
export const validateCreateIndent = preprocess({
  schema: {
    productCode:     { required: true },
    productName:     { required: true },
    batchNo:         { required: true },
    diNo:            { required: true },
    batchSize:       { required: true, positive: true },
    cycleBatchSize:  { positive: true },
  },
})

// POST /indent/mark-po-sent — markPoSent
export const validateMarkPoSent = preprocess({
  schema: {
    indentIds: { custom: (value) => isNonEmptyArray('indentIds', value) },
  },
})
