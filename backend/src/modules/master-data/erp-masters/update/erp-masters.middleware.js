/**
 * Master Data › ERP Masters › Update — Local Middleware
 * All three update endpoints are partial-update (every field optional,
 * `if (x !== undefined)`), so there's no fixed required-field schema —
 * sanitize + type-convert only, with format checks on the fields that have
 * one (email/phone), so a boolean/number field sent as a frontend string
 * ("true", "12.5") lands on Prisma as the real type instead of a string.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateUpdateItem = preprocess()

export const validateUpdateSupplier = preprocess({
  schema: {
    phone: { phone: true },
    email: { email: true },
  },
})

export const validateUpdateErpEquipment = preprocess()
