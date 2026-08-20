import fs from 'fs'
import path from 'path'
import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { GATE_INWARD_INVOICES_DIR, GATE_OUTWARD_INVOICES_DIR } from '../utils/storage-paths.js'

// `invoiceDocFileName` stores the *generated* on-disk name (multer's
// `<record-id>-<timestamp><ext>`, see router.js's invoiceDocUpload), not the
// original filename the browser/camera assigned — the DB used to also carry
// invoiceDocPath/invoiceDocMimeType/invoiceDocSize, but each was either
// redundant (the storage directory is these two fixed constants — the only
// variable part is the filename, always known at upload time), derivable
// (content-type from the extension — uploads are already restricted to
// exactly these 4 types), or unused (size was never read back anywhere).
const CONTENT_TYPE_BY_EXT = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}
function contentTypeFor(filename) {
  return CONTENT_TYPE_BY_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream'
}

// Upload (or replace) the invoice document attached to an existing Gate
// Inward entry. A previous file, if any, is deleted from disk once the new
// one is safely recorded, so re-uploads don't leak orphaned files.
const uploadGateInwardInvoiceDocument = async (req, res) => {
  const { id } = req.params
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded, or the file type is not supported (PDF, JPEG, PNG only).', code: 'VALIDATION_ERROR' })
    }

    const before = await prisma.gateInward.findUnique({ where: { inwardId: id }, select: { invoiceDocFileName: true } })
    if (!before) {
      fs.unlink(req.file.path, () => {})
      return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    }

    const row = await prisma.gateInward.update({
      where: { inwardId: id },
      data: { invoiceDocFileName: req.file.filename },
    })

    if (before.invoiceDocFileName && before.invoiceDocFileName !== req.file.filename) {
      fs.unlink(path.join(GATE_INWARD_INVOICES_DIR, before.invoiceDocFileName), () => {})
    }

    // A first-time attach (no prior document — the common case right after
    // creating the entry) isn't logged separately from the CREATE that just
    // happened a moment earlier; only a genuine REPLACE of an existing,
    // already-attached document is audit-worthy on its own, since it
    // destroys the old file.
    if (before.invoiceDocFileName) {
      await writeAudit({
        ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_inward', recordId: id,
        oldValue: { invoiceDocFileName: before.invoiceDocFileName },
        newValue: { invoiceDocFileName: req.file.filename },
        notes: 'invoice document replaced',
      })
    }

    return res.json({ success: true, data: row })
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {})
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('uploadGateInwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Streams the stored invoice document back inline (not as a forced
// download) so the browser renders the PDF/image directly — the "view it
// in-app instead of needing the physical copy" requirement.
const viewGateInwardInvoiceDocument = async (req, res) => {
  const { id } = req.params
  try {
    const row = await prisma.gateInward.findUnique({ where: { inwardId: id }, select: { invoiceDocFileName: true } })
    const filePath = row?.invoiceDocFileName && path.join(GATE_INWARD_INVOICES_DIR, row.invoiceDocFileName)
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'No invoice document is attached to this entry.', code: 'NOT_FOUND' })
    }

    res.setHeader('Content-Type', contentTypeFor(row.invoiceDocFileName))
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.invoiceDocFileName)}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    console.error('viewGateInwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Upload (or replace) the invoice document attached to an existing Gate
// Outward entry — mirrors uploadGateInwardInvoiceDocument above.
const uploadGateOutwardInvoiceDocument = async (req, res) => {
  const { id } = req.params
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded, or the file type is not supported (PDF, JPEG, PNG only).', code: 'VALIDATION_ERROR' })
    }

    const before = await prisma.gateOutward.findUnique({ where: { outwardId: id }, select: { invoiceDocFileName: true } })
    if (!before) {
      fs.unlink(req.file.path, () => {})
      return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    }

    const row = await prisma.gateOutward.update({
      where: { outwardId: id },
      data: { invoiceDocFileName: req.file.filename },
    })

    if (before.invoiceDocFileName && before.invoiceDocFileName !== req.file.filename) {
      fs.unlink(path.join(GATE_OUTWARD_INVOICES_DIR, before.invoiceDocFileName), () => {})
    }

    // Same reasoning as uploadGateInwardInvoiceDocument above — only a
    // REPLACE of an already-attached document gets its own audit row.
    if (before.invoiceDocFileName) {
      await writeAudit({
        ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_outward', recordId: id,
        oldValue: { invoiceDocFileName: before.invoiceDocFileName },
        newValue: { invoiceDocFileName: req.file.filename },
        notes: 'invoice document replaced',
      })
    }

    return res.json({ success: true, data: row })
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {})
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('uploadGateOutwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Streams the stored invoice document back inline — mirrors
// viewGateInwardInvoiceDocument above.
const viewGateOutwardInvoiceDocument = async (req, res) => {
  const { id } = req.params
  try {
    const row = await prisma.gateOutward.findUnique({ where: { outwardId: id }, select: { invoiceDocFileName: true } })
    const filePath = row?.invoiceDocFileName && path.join(GATE_OUTWARD_INVOICES_DIR, row.invoiceDocFileName)
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'No invoice document is attached to this entry.', code: 'NOT_FOUND' })
    }

    res.setHeader('Content-Type', contentTypeFor(row.invoiceDocFileName))
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.invoiceDocFileName)}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    console.error('viewGateOutwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export {
  uploadGateInwardInvoiceDocument, viewGateInwardInvoiceDocument,
  uploadGateOutwardInvoiceDocument, viewGateOutwardInvoiceDocument,
}
