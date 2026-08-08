import express from 'express'
import multer from 'multer'
import { authenticate, authorize } from '../../../middleware/auth.js'
import { previewImport, executeImport } from './create/import.controller.js'

const ImportRouter = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /\.(xlsx|xls|csv)$/i.test(file.originalname)),
})
const managerOrAbove = authorize(['admin'])

ImportRouter.post('/preview', authenticate, managerOrAbove, upload.single('file'), previewImport)
ImportRouter.post('/execute', authenticate, managerOrAbove, upload.single('file'), executeImport)

export default ImportRouter
