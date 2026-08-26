import prisma from '../../../../../db.js'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js';

const MM = 2.8346
const W  = 100 * MM
const H  =  50 * MM
const M  =   3 * MM

const qrBuffer = async (text) => {
  const dataUrl = await QRCode.toDataURL(text, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

export const listContainers = async (req, res) => {
  try {
    const { itemCode } = req.query
    const where = itemCode !== undefined ? { itemCode } : {}
    const containers = await prisma.containerMaster.findMany({ where, orderBy: { itemName: 'asc' } })
    return res.json({ success: true, data: containers })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const getContainer = async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.containerId)
    const container = await prisma.containerMaster.findUnique({ where: { containerId: id } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: container })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const getContainerLabel = async (req, res) => {
  try {
    const container = await prisma.containerMaster.findUnique({
      where: { containerId: decodeURIComponent(req.params.containerId) }
    })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })

    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true })
    const chunks = []
    doc.on('data', c => chunks.push(c))

    await new Promise(async (resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      // ── HEADER: Container ID (large, white on navy) — same treatment as the
      // raw-material pack label so it survives monochrome thermal printing.
      const headerH = 15 * MM
      doc.rect(0, 0, W, headerH).fill('#1a3a6b')

      const idText = container.containerId
      const availWidth = W - 2 * M
      let idFontSize = 18
      doc.font('Helvetica-Bold')
      while (idFontSize > 10 && idText.length * idFontSize * 0.55 > availWidth) idFontSize -= 1

      doc.fillColor('#ffffff').fontSize(idFontSize)
      const idTextH = idFontSize * 1.2
      doc.text(idText, M, (headerH - idTextH) / 2, { width: availWidth, align: 'center', lineBreak: false })

      // ── QR CODE (right side) ──────────────────────────────────────────────
      const qrSize = 24 * MM
      const qrX = W - qrSize - M
      const qrY = headerH + M
      const qrImg = await qrBuffer(`CONT:${container.containerId}`)
      doc.image(qrImg, qrX, qrY, { width: qrSize, height: qrSize })

      const createdStr = container.createdAt
        ? new Date(container.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—'
      const dateY = qrY + qrSize + 1.5 * MM
      doc.fillColor('#444444').fontSize(7).font('Helvetica')
      doc.text(`Made: ${createdStr}`, qrX, dateY, { width: qrSize, align: 'center' })

      // ── LEFT CONTENT AREA ───────────────────────────────────────────────────
      const leftW = qrX - M - 2 * MM
      let curY = headerH + M

      const itemNameText = container.itemName
      doc.font('Helvetica-Bold')
      let itemFontSize = 14
      while (itemFontSize > 8 && itemNameText.length * itemFontSize * 0.52 > leftW) itemFontSize -= 1

      doc.fillColor('#666666').fontSize(7).font('Helvetica-Bold')
      doc.text('ITEM', M, curY)
      curY += 7.5
      doc.fillColor('#111111').fontSize(itemFontSize).font('Helvetica-Bold')
      doc.text(itemNameText, M, curY, { width: leftW, lineBreak: true })
      const itemLines = Math.ceil((itemNameText.length * itemFontSize * 0.52) / leftW)
      curY += (itemLines > 1 ? itemFontSize * 2.4 : itemFontSize * 1.4)

      doc.fillColor('#666666').fontSize(7).font('Helvetica-Bold')
      doc.text('CAPACITY', M, curY)
      curY += 7.5
      doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold')
      doc.text(`${container.capacity} ${container.uom}`, M, curY, { width: leftW })
      curY += 18

      doc.fillColor('#666666').fontSize(7).font('Helvetica-Bold')
      doc.text('CODE', M, curY)
      curY += 7.5
      doc.fillColor('#222222').fontSize(itemFontSize).font('Helvetica-Bold')
      doc.text(container.itemCode, M, curY, { width: leftW })

      doc.end()
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="CONT-${container.containerId}.pdf"`)
    return res.send(Buffer.concat(chunks))
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
