// routes/bom-sends.js
// Planner → Store: BOM send requests (Formulation BOM / Packing BOM)
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Generate sendId like BOM-2605-003
async function nextSendId() {
  const yymm = new Date().toISOString().slice(2, 7).replace('-', '')
  const prefix = `BOM-${yymm}-`
  const last = await prisma.bomSend.findFirst({
    where: { sendId: { startsWith: prefix } },
    orderBy: { sendId: 'desc' },
  })
  const seq = last ? parseInt(last.sendId.slice(-3)) + 1 : 1
  return prefix + String(seq).padStart(3, '0')
}

export default async function bomSendRoutes(fastify) {
  // ── GET /api/bom-sends  ───────────────────────────────────────────────────
  // List all BOM sends; filter by status or planId via query params
  fastify.get('/', async (req) => {
    const { status, planId, section } = req.query
    const where = {}
    if (status && status !== 'ALL') where.status = status
    if (planId) where.planId = planId
    if (section) where.sectionType = section

    const sends = await prisma.bomSend.findMany({
      where,
      orderBy: { sentAt: 'desc' },
    })
    return { success: true, data: sends }
  })

  // ── POST /api/bom-sends  ──────────────────────────────────────────────────
  // Planner sends BOM(s) — one record per bomType
  fastify.post('/', async (req, reply) => {
    const {
      indentId, planId, productCode, productName,
      batchNo, diNo, sectionType, bomType,
      totalQty, uom, sentBy, remarks,
    } = req.body

    if (!planId || !productCode || !productName || !batchNo || !diNo || !bomType || !totalQty)
      return reply.status(400).send({ success: false, error: 'planId, productCode, productName, batchNo, diNo, bomType, totalQty are required' })

    const sendId = await nextSendId()
    const send = await prisma.bomSend.create({
      data: {
        sendId,
        indentId:    indentId    || null,
        planId,
        productCode,
        productName,
        batchNo,
        diNo,
        sectionType: sectionType || null,
        bomType,
        totalQty:    parseFloat(totalQty),
        uom:         uom         || 'KG',
        status:      'PENDING',
        sentBy:      sentBy      || null,
        remarks:     remarks     || null,
      },
    })
    return { success: true, data: send }
  })

  // ── PATCH /api/bom-sends/:id/status  ─────────────────────────────────────
  // Store team updates status: PICKED | READY_TO_ISSUE | ISSUED
  fastify.patch('/:id/status', async (req, reply) => {
    const { status, remarks } = req.body
    const allowed = ['PENDING', 'PICKED', 'READY_TO_ISSUE', 'ISSUED', 'CANCELLED']
    if (!allowed.includes(status))
      return reply.status(400).send({ success: false, error: `status must be one of: ${allowed.join(', ')}` })

    const now = new Date()
    const data = { status }
    if (remarks !== undefined) data.remarks = remarks
    if (status === 'PICKED')          data.pickedAt  = now
    if (status === 'ISSUED')          data.issuedAt  = now

    const send = await prisma.bomSend.update({
      where: { id: req.params.id },
      data,
    })
    return { success: true, data: send }
  })

  // ── DELETE /api/bom-sends/:id  ────────────────────────────────────────────
  fastify.delete('/:id', async (req) => {
    await prisma.bomSend.delete({ where: { id: req.params.id } })
    return { success: true }
  })
}
