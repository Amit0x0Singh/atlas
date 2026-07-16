/**
 * Store › Inward › Create — Local Middleware
 * Validates the pack-inward scanning session endpoints. sessionId/itemCode/
 * lotNo/packId/packIds are all identifiers that must never be reshaped by
 * sanitize/convert — sessionId is a cuid (NOT a uuid, so no format check is
 * applied beyond "present"), pack IDs are opaque QR-encoded strings. These
 * are listed in excludeFromConversion explicitly even where the default
 * identifier-pattern guard would already catch them, since a wrong
 * conversion here would corrupt an active scanning session.
 */
import { preprocess } from '../../../../../middleware/preprocessing/index.js'
import { isNonEmptyArray } from '../../../../../middleware/validators/common.js'

export const validateCreateSession = preprocess({
  excludeFromConversion: ['itemCode', 'lotNo', 'warehouse'],
  schema: {
    itemCode:  { required: true },
    lotNo:     { required: true },
    warehouse: { required: true },
  },
})

export const validateSessionIdParam = preprocess({
  target: 'params',
  schema: {
    sessionId: { required: true },
  },
})

export const validateScanPack = preprocess({
  excludeFromConversion: ['packId', 'warehouse'],
  schema: {
    packId: { required: true },
  },
})

export const validateBatchScanPack = preprocess({
  excludeFromConversion: ['packIds', 'warehouse'],
  schema: {
    packIds: { custom: (value) => isNonEmptyArray('packIds', value) },
  },
})
