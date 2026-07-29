/**
 * Store › Inward › Create — Local Middleware
 * Validates the pack-inward scanning endpoints. itemCode/lotNo/packId/
 * packIds are all identifiers that must never be reshaped by
 * sanitize/convert — pack IDs are opaque QR-encoded strings. These are
 * listed in excludeFromConversion explicitly even where the default
 * identifier-pattern guard would already catch them, since a wrong
 * conversion here would corrupt an in-progress scan.
 */
import { preprocess } from '../../../../../middleware/preprocessing/index.js'
import { isNonEmptyArray } from '../../../../../middleware/validators/common.js'

export const validateLotParams = preprocess({
  target: 'params',
  excludeFromConversion: ['itemCode', 'lotNo'],
  schema: {
    itemCode: { required: true },
    lotNo:    { required: true },
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
