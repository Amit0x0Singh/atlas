import prisma from '../../../../../db.js'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'

// Canonical reason categories — kept in sync with the frontend button set
// (adjustment-tab/reasons.js). The category is the only classification the
// operator picks; `reason` is stored as its readable label so history rows
// and exports stay self-describing.
export const REASON_CATEGORY_LABELS = {
  ISSUANCE:           'During issuance',
  PRODUCTION_RELEASE: 'Production release',
  TRANSPORT:          'Transportation',
  SPILLAGE:           'Spillage',
  CONTAMINATION:      'Contamination',
  WEIGHING_ERROR:     'Weighing error',
  OTHER:              'Other',
}
export const REASON_CATEGORIES = Object.keys(REASON_CATEGORY_LABELS)

// Books a stock loss against one inward batch. The deduction is re-validated
// against live remaining_qty_kg inside the transaction (a stale client view
// — someone else issued/adjusted the same batch meanwhile — fails cleanly
// instead of pushing the batch negative), then mirrored onto the batch's
// container, exactly as createSfgOutward does per allocation.
export const createSfgAdjustment = async (req, res) => {
  try {
    const { inward_id, loss_qty_kg, reason_category, remarks } = req.body || {}

    if (!inward_id || !reason_category)
      return res.status(400).json({ success: false, error: 'inward_id and reason_category required', code: 'VALIDATION_ERROR' })
    if (!REASON_CATEGORIES.includes(reason_category))
      return res.status(400).json({ success: false, error: `reason_category must be one of: ${REASON_CATEGORIES.join(', ')}`, code: 'VALIDATION_ERROR' })

    const loss = Number(loss_qty_kg)
    if (!loss || loss <= 0)
      return res.status(400).json({ success: false, error: 'loss_qty_kg must be greater than 0', code: 'VALIDATION_ERROR' })

    const result = await prisma.$transaction(async (tx) => {
      const inward = await tx.microbialSfgInward.findUnique({
        where: { inwardId: inward_id },
        include: { container: { select: { inactive: true } } },
      })
      if (!inward) throw new Error(`Inward batch ${inward_id} not found`)
      if (inward.container?.inactive) throw new Error(`${inward.containerCode} is inactive and can no longer be adjusted`)

      const remaining = Number(inward.remainingQtyKg)
      if (remaining <= 0.0001 || inward.status !== 'ACTIVE')
        throw new Error(`${inward.containerCode} has no remaining quantity — nothing to adjust`)
      if (loss > remaining + 0.0001)
        throw new Error(`${inward.containerCode}: only ${remaining.toFixed(4)} kg remaining, cannot record a loss of ${loss.toFixed(4)} kg`)

      const newRemaining = Math.max(0, remaining - loss)
      const newStatus = newRemaining <= 0.0001 ? 'EXHAUSTED' : 'ACTIVE'
      await tx.microbialSfgInward.update({
        where: { inwardId: inward_id },
        data: { remainingQtyKg: newRemaining, status: newStatus },
      })

      if (inward.containerId) {
        const container = await tx.microbialSfgContainer.findUnique({ where: { containerId: inward.containerId } })
        if (container) {
          const newContainerQty = Math.max(0, Number(container.currentQtyKg) - loss)
          const newFill = newContainerQty <= 0.0001
            ? 'EMPTY'
            : (container.capacityKg && newContainerQty >= Number(container.capacityKg) ? 'FULL' : 'PARTIAL')
          await tx.microbialSfgContainer.update({
            where: { containerId: container.containerId },
            data: { currentQtyKg: newContainerQty, fillStatus: newFill },
          })
        }
      }

      const adjustment = await tx.microbialSfgAdjustment.create({
        data: {
          inwardId: inward.inwardId,
          containerId: inward.containerId || null,
          containerCode: inward.containerCode,
          microbeId: inward.microbeId || null,
          microbeCode: inward.microbeCode,
          microbeName: inward.microbeName,
          microbeType: inward.microbeType,
          lossQtyKg: loss,
          cfuPerGAtAdjust: inward.inhouseCfuPerG != null ? Number(inward.inhouseCfuPerG) : null,
          balanceBeforeKg: remaining,
          balanceAfterKg: newRemaining,
          reasonCategory: reason_category,
          reason: REASON_CATEGORY_LABELS[reason_category],
          stage: null,
          remarks: remarks?.trim() || null,
          batchCode: inward.biomassBatchCode || null,
        },
      })

      return { adjustment, newRemaining, newStatus }
    })

    return res.status(201).json({
      success: true,
      data: {
        ...toSnakeRow(result.adjustment),
        new_remaining: result.newRemaining,
        new_status: result.newStatus,
      },
    })
  } catch (err) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(err), code: 'ADJUSTMENT_ERROR' })
  }
}
