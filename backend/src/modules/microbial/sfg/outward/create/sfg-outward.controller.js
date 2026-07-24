import prisma from '../../../../../db.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'

// Auto-saved on every header/row change while an issuance is in progress —
// same role as upsertBomSession for Material Issue by BOM. `id` is client-
// generated (once, when a task is first opened) so repeated saves just
// update the same row instead of piling up duplicates.
export const upsertOutwardSession = async (req, res) => {
  const { id } = req.params
  const { plan_task_id, header, rows } = req.body || {}
  if (!id || !header || !rows)
    return res.status(400).json({ success: false, error: 'id, header, rows required', code: 'VALIDATION_ERROR' })
  try {
    const data = { planTaskId: plan_task_id || null, header, rows }
    const session = await prisma.microbialSfgOutwardSession.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
    return res.json({ success: true, data: toSnakeRow(session) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Persists an issuance built from the (possibly user-edited) allocations the
// client got back from POST /outward/preview. Quantities are re-validated
// against live remaining_qty_kg inside the transaction — a stale preview
// (someone else issued from the same batch meanwhile) fails cleanly instead
// of pushing a batch negative.
export const createSfgOutward = async (req, res) => {
  try {
    const {
      product_name, customer_name, di_number, batch_code, section,
      order_qty_kg, issuer_name, receiver_name, requirements,
    } = req.body || {}

    if (!product_name || !Array.isArray(requirements) || !requirements.length)
      return res.status(400).json({ success: false, error: 'product_name and requirements[] required', code: 'VALIDATION_ERROR' })

    for (const r of requirements) {
      if (!r.microbe_code || !r.required_qty_kg || !r.required_cfu_per_g || !Array.isArray(r.allocations) || !r.allocations.length)
        return res.status(400).json({ success: false, error: 'each requirement needs microbe_code, required_qty_kg, required_cfu_per_g, allocations[]', code: 'VALIDATION_ERROR' })
      for (const a of r.allocations) {
        if (!a.inward_id || !a.qty_issued_kg || Number(a.qty_issued_kg) <= 0)
          return res.status(400).json({ success: false, error: 'each allocation needs inward_id and qty_issued_kg > 0', code: 'VALIDATION_ERROR' })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const outward = await tx.microbialSfgOutward.create({
        data: {
          productName: product_name,
          customerName: customer_name || null,
          diNumber: di_number || null,
          batchCode: batch_code || null,
          section: section || null,
          orderQtyKg: order_qty_kg != null ? Number(order_qty_kg) : null,
          issuerName: issuer_name || null,
          receiverName: receiver_name || null,
        },
      })

      for (const r of requirements) {
        const pickedTotal = r.allocations.reduce((s, a) => s + Number(a.qty_issued_kg), 0)
        const isPartial = pickedTotal + 0.0001 < Number(r.required_qty_kg)

        for (const a of r.allocations) {
          const inward = await tx.microbialSfgInward.findUnique({ where: { inwardId: a.inward_id }, include: { container: { select: { inactive: true } } } })
          if (!inward) throw new Error(`Inward batch ${a.inward_id} not found`)
          if (inward.container?.inactive) throw new Error(`${inward.containerCode} is inactive and can no longer be issued from`)
          const qty = Number(a.qty_issued_kg)
          if (qty > Number(inward.remainingQtyKg) + 0.0001)
            throw new Error(`${inward.containerCode}: only ${Number(inward.remainingQtyKg).toFixed(4)} kg remaining, cannot issue ${qty.toFixed(4)} kg`)

          const newRemaining = Math.max(0, Number(inward.remainingQtyKg) - qty)
          const newStatus = newRemaining <= 0.0001 ? 'EXHAUSTED' : 'ACTIVE'
          await tx.microbialSfgInward.update({
            where: { inwardId: a.inward_id },
            data: { remainingQtyKg: newRemaining, status: newStatus },
          })

          const container = await tx.microbialSfgContainer.findUnique({ where: { containerId: inward.containerId } })
          if (container) {
            const newContainerQty = Math.max(0, Number(container.currentQtyKg) - qty)
            const newFill = newContainerQty <= 0.0001 ? 'EMPTY' : (container.capacityKg && newContainerQty >= Number(container.capacityKg) ? 'FULL' : 'PARTIAL')
            await tx.microbialSfgContainer.update({
              where: { containerId: container.containerId },
              data: { currentQtyKg: newContainerQty, fillStatus: newFill },
            })
          }

          await tx.microbialSfgOutwardLine.create({
            data: {
              outwardId: outward.outwardId,
              microbeId: r.microbe_id || null,
              microbeCode: r.microbe_code,
              microbeName: r.microbe_name || inward.microbeName,
              microbeType: inward.microbeType,
              requiredQtyKg: Number(r.required_qty_kg),
              requiredCfuPerG: Number(r.required_cfu_per_g),
              inwardId: a.inward_id,
              containerId: inward.containerId,
              containerCode: inward.containerCode,
              qtyIssuedKg: qty,
              cfuPerGAtIssue: Number(inward.inhouseCfuPerG),
              balanceAfterKg: newRemaining,
              isPartial,
            },
          })
        }
      }

      return tx.microbialSfgOutward.findUnique({ where: { outwardId: outward.outwardId }, include: { lines: true } })
    })

    return res.status(201).json({ success: true, data: toSnakeRow(result) })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'ISSUANCE_ERROR' })
  }
}
