import express from 'express'
import multer from 'multer'
import { authorize } from '../../../middleware/auth.js'
import { previewImport, executeImport } from './create/import.controller.js'

const ImportRouter = express.Router()
const upload = multer({ storage: multer.memoryStorage() })
const canImport = authorize('admin.import.execute')

ImportRouter.post('/preview', canImport, upload.single('file'), previewImport)
ImportRouter.post('/execute', canImport, upload.single('file'), executeImport)

export default ImportRouter
