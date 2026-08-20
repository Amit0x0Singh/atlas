import fs from 'fs'
import path from 'path'
import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { GATE_INWARD_INVOICES_DIR, GATE_OUTWARD_INVOICES_DIR } from '../utils/storage-paths.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js';

// `invoiceDocFileNames` stores the *generated* on-disk names (multer's
// `<record-id>-<timestamp>-<random><ext>`, see router.js's invoiceDocUpload),
// not the original filenames the browser/camera assigned — the storage
// directory is a fixed constant per direction, so only the filename varies.
// An entry can carry several documents (multiple photos/scans of the same
// invoice); uploading appends to the array rather than replacing it.
const CONTENT_TYPE_BY_EXT = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}
function contentTypeFor(filename) {
  return CONTENT_TYPE_BY_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream'
}

// Attach one or more invoice documents to an existing Gate Inward entry.
// Always appends — never removes an already-attached document (there's no
// "replace" semantics here anymore now that an entry can hold several).
const uploadGateInwardInvoiceDocument = async (req, res) => {
  const { id } = req.params
  const files = req.files || []
  try {
    if (!files.length) {
      return res.status(400).json({ success: false, error: 'No files uploaded, or the file type is not supported (PDF, JPEG, PNG only).', code: 'VALIDATION_ERROR' })
    }

    const fileNames = files.map((f) => f.filename)
    const row = await prisma.gateInward.update({
      where: { inwardId: id },
      data: { invoiceDocFileNames: { push: fileNames } },
    })

    await writeAudit({
      ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_inward', recordId: id,
      newValue: { invoiceDocFileNamesAdded: fileNames },
      notes: `${fileNames.length} invoice document(s) attached`,
    })

    return res.json({ success: true, data: row })
  } catch (err) {
    for (const f of files) fs.unlink(f.path, () => {})
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('uploadGateInwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Streams one stored invoice document back inline (not as a forced
// download) so the browser renders the PDF/image directly — the "view it
// in-app instead of needing the physical copy" requirement. `fileName` must
// be one this entry actually has attached (not just any file on disk in the
// shared storage dir) — path.basename also strips any directory component
// out of the client-supplied value as a traversal guard.
const viewGateInwardInvoiceDocument = async (req, res) => {
  const { id, fileName } = req.params
  try {
    const row = await prisma.gateInward.findUnique({ where: { inwardId: id }, select: { invoiceDocFileNames: true } })
    const safeName = path.basename(fileName || '')
    if (!row || !row.invoiceDocFileNames.includes(safeName)) {
      return res.status(404).json({ success: false, error: 'No matching invoice document is attached to this entry.', code: 'NOT_FOUND' })
    }
    const filePath = path.join(GATE_INWARD_INVOICES_DIR, safeName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'No matching invoice document is attached to this entry.', code: 'NOT_FOUND' })
    }

    res.setHeader('Content-Type', contentTypeFor(safeName))
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeName)}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    console.error('viewGateInwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Attach one or more invoice documents to an existing Gate Outward entry —
// mirrors uploadGateInwardInvoiceDocument above.
const uploadGateOutwardInvoiceDocument = async (req, res) => {
  const { id } = req.params
  const files = req.files || []
  try {
    if (!files.length) {
      return res.status(400).json({ success: false, error: 'No files uploaded, or the file type is not supported (PDF, JPEG, PNG only).', code: 'VALIDATION_ERROR' })
    }

    const fileNames = files.map((f) => f.filename)
    const row = await prisma.gateOutward.update({
      where: { outwardId: id },
      data: { invoiceDocFileNames: { push: fileNames } },
    })

    await writeAudit({
      ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_outward', recordId: id,
      newValue: { invoiceDocFileNamesAdded: fileNames },
      notes: `${fileNames.length} invoice document(s) attached`,
    })

    return res.json({ success: true, data: row })
  } catch (err) {
    for (const f of files) fs.unlink(f.path, () => {})
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('uploadGateOutwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Streams one stored invoice document back inline — mirrors
// viewGateInwardInvoiceDocument above.
const viewGateOutwardInvoiceDocument = async (req, res) => {
  const { id, fileName } = req.params
  try {
    const row = await prisma.gateOutward.findUnique({ where: { outwardId: id }, select: { invoiceDocFileNames: true } })
    const safeName = path.basename(fileName || '')
    if (!row || !row.invoiceDocFileNames.includes(safeName)) {
      return res.status(404).json({ success: false, error: 'No matching invoice document is attached to this entry.', code: 'NOT_FOUND' })
    }
    const filePath = path.join(GATE_OUTWARD_INVOICES_DIR, safeName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'No matching invoice document is attached to this entry.', code: 'NOT_FOUND' })
    }

    res.setHeader('Content-Type', contentTypeFor(safeName))
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeName)}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    console.error('viewGateOutwardInvoiceDocument error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export {
  uploadGateInwardInvoiceDocument, viewGateInwardInvoiceDocument,
  uploadGateOutwardInvoiceDocument, viewGateOutwardInvoiceDocument,
}
