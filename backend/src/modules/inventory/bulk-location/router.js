import express from 'express'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { listLocations, getLocation, getLocationLabel, getBulkStockSummary } from './get/bulk-location.controller.js'
import { createLocation, bulkInward, bulkOutward } from './create/bulk-location.controller.js'
import { validateCreateLocation, validateBulkInward, validateBulkOutward } from './create/bulk-location.middleware.js'
import { deleteLocation } from './delete/bulk-location.controller.js'
import { validateLocationIdParam } from './delete/bulk-location.middleware.js'

const BulkLocationRouter = express.Router()
const storeOrAbove = authorize(['store'])
const managerOrAbove = authorize(['store'])

BulkLocationRouter.get('/summary', authenticate, getBulkStockSummary)
BulkLocationRouter.get('/locations', authenticate, listLocations)
BulkLocationRouter.post('/locations', authenticate, managerOrAbove, validateCreateLocation, createLocation)
BulkLocationRouter.get('/locations/:locationId/label', getLocationLabel)
BulkLocationRouter.get('/locations/:locationId', authenticate, getLocation)
BulkLocationRouter.delete('/locations/:locationId', authenticate, managerOrAbove, validateLocationIdParam, deleteLocation)
BulkLocationRouter.post('/inward', authenticate, storeOrAbove, validateBulkInward, bulkInward)
BulkLocationRouter.post('/outward', authenticate, storeOrAbove, validateBulkOutward, bulkOutward)

export default BulkLocationRouter
