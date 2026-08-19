import fs from 'fs'
import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

// invoiceDocPath is a server-side disk path — never send it back to the
// frontend (see the field comment on GateInward.invoiceDocPath).
function stripDocPath(row) {
  if (!row) return row
  const { invoiceDocPath, ...safe } = row
  return safe
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

    const before = await prisma.gateInward.findUnique({ where: { inwardId: id }, select: { invoiceDocPath: true, invoiceDocFileName: true } })
    if (!before) {
      fs.unlink(req.file.path, () => {})
      return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    }

    const row = await prisma.gateInward.update({
      where: { inwardId: id },
      data: {
        invoiceDocPath:     req.file.path,
        invoiceDocFileName: req.file.originalname,
        invoiceDocMimeType: req.file.mimetype,
        invoiceDocSize:     req.file.size,
      },
    })

    if (before.invoiceDocPath && before.invoiceDocPath !== req.file.path) {
      fs.unlink(before.invoiceDocPath, () => {})
    }

    await writeAudit({
      ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_inward', recordId: id,
      oldValue: { invoiceDocFileName: before.invoiceDocFileName || null },
      newValue: { invoiceDocFileName: req.file.originalname },
      notes: 'invoice document uploaded',
    })

    return res.json({ success: true, data: stripDocPath(row) })
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
    const row = await prisma.gateInward.findUnique({
      where: { inwardId: id },
      select: { invoiceDocPath: true, invoiceDocFileName: true, invoiceDocMimeType: true },
    })
    if (!row || !row.invoiceDocPath || !fs.existsSync(row.invoiceDocPath)) {
      return res.status(404).json({ success: false, error: 'No invoice document is attached to this entry.', code: 'NOT_FOUND' })
    }

    res.setHeader('Content-Type', row.invoiceDocMimeType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.invoiceDocFileName || 'invoice')}"`)
    fs.createReadStream(row.invoiceDocPath).pipe(res)
  } catch (err) {
    console.error('viewGateInwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export { uploadGateInwardInvoiceDocument, viewGateInwardInvoiceDocument, stripDocPath }
