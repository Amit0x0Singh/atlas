import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { listLocations, getLocation, getLocationLabel, getBulkStockSummary } from './get/bulk-location.controller.js'
import { createLocation, bulkInward, bulkOutward } from './create/bulk-location.controller.js'
import { validateCreateLocation, validateBulkInward, validateBulkOutward } from './create/bulk-location.middleware.js'
import { deleteLocation } from './delete/bulk-location.controller.js'
import { validateLocationIdParam } from './delete/bulk-location.middleware.js'

const BulkLocationRouter = express.Router()
const canView   = authorize('inventory.bulk-location.view')
const canCreate = authorize('inventory.bulk-location.create')
const canDelete = authorize('inventory.bulk-location.delete')

BulkLocationRouter.get('/summary', canView, getBulkStockSummary)
BulkLocationRouter.get('/locations', canView, listLocations)
BulkLocationRouter.post('/locations', canCreate, validateCreateLocation, createLocation)
BulkLocationRouter.get('/locations/:locationId/label', canView, getLocationLabel)
BulkLocationRouter.get('/locations/:locationId', canView, getLocation)
BulkLocationRouter.delete('/locations/:locationId', canDelete, validateLocationIdParam, deleteLocation)
BulkLocationRouter.post('/inward', authorize('inventory.bulk-location.inward'), validateBulkInward, bulkInward)
BulkLocationRouter.post('/outward', authorize('inventory.bulk-location.outward'), validateBulkOutward, bulkOutward)

export default BulkLocationRouter
