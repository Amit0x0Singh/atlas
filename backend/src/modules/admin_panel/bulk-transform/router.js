import express from 'express'
import { previewTransform } from './preview/bulk-transform.controller.js'
import { createTransform } from './create/bulk-transform.controller.js'
import { getTransformStatus } from './get/bulk-transform.controller.js'

const router = express.Router()

router.post('/preview', previewTransform)
router.post('/', createTransform)
router.get('/:id/status', getTransformStatus)

export default router
