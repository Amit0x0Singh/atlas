import prisma from '../../../../../db.js'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'

export const listSfgContainers = async (req, res) => {
  try {
    const { microbe_code, type_code, fill_status } = req.query
    const where = {}
    if (microbe_code) where.microbeCode = microbe_code
    if (type_code)    where.typeCode    = type_code
    if (fill_status)  where.fillStatus  = fill_status

    const rows = await prisma.microbialSfgContainer.findMany({
      where,
      include: {
        _count: { select: { inwards: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: [{ microbeCode: 'asc' }, { typeCode: 'asc' }, { seqNo: 'asc' }],
    })

    const data = rows.map(r => ({ ...r, batch_count: r._count.inwards, _count: undefined }))
    return res.json({ success: true, data: toSnakeRow(data) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const listAvailableSfgContainers = async (req, res) => {
  try {
    const { microbe_code, type_code } = req.query
    const rows = await prisma.microbialSfgContainer.findMany({
      where: {
        microbeCode: microbe_code,
        typeCode:    type_code,
        fillStatus:  { in: ['PARTIAL', 'EMPTY'] },
      },
      orderBy: [{ fillStatus: 'desc' }, { seqNo: 'asc' }],
    })
    return res.json({ success: true, data: toSnakeRow(rows) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const getNextContainerCode = async (req, res) => {
  try {
    const { microbe_code, type_code } = req.query
    if (!microbe_code || !type_code) return res.status(400).json({ success: false, error: 'microbe_code and type_code required', code: 'VALIDATION_ERROR' })

    // Peek at the same MicrobialSfgContainerSeq counter createSfgInward
    // actually increments (create/sfg-inward.controller.js's
    // getNextContainerSeq) — that's the sole source of truth for the real
    // seqNo/code at creation time, so the preview has to read it too rather
    // than re-derive its own guess from the containers table's current
    // max(seqNo). Those two can drift apart the moment a container is ever
    // inserted by any path that doesn't touch this counter (an import
    // script, a data migration, a manual fix) — once they do, a max()-based
    // preview would keep suggesting an already-taken code indefinitely,
    // since nothing would ever notice the mismatch. This is a read-only
    // peek (no increment) — safe without extra locking, since actual
    // creation atomically re-derives the real value regardless of what was
    // last previewed.
    const seqRow = await prisma.microbialSfgContainerSeq.findUnique({
      where: { microbeCode_typeCode: { microbeCode: microbe_code, typeCode: type_code } },
    })
    const nextSeq = (seqRow?.seq || 0) + 1
    const next_code = `${microbe_code}-${type_code}-${String(nextSeq).padStart(3, '0')}`
    return res.json({ success: true, data: { next_code, next_seq: nextSeq } })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const getSfgContainerBatches = async (req, res) => {
  try {
    const rows = await prisma.microbialSfgInward.findMany({
      where: { containerId: req.params.id },
      orderBy: [{ dateOfHarvest: 'asc' }, { createdAt: 'asc' }],
    })
    return res.json({ success: true, data: toSnakeRow(rows) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const listSfgInward = async (req, res) => {
  try {
    const { microbe_code, microbe_type, status } = req.query
    const where = {}
    if (microbe_code) where.microbeCode = microbe_code
    if (microbe_type) where.microbeType = microbe_type
    if (status)       where.status      = status

    const rows = await prisma.microbialSfgInward.findMany({
      where,
      include: { container: { select: { location: true, fillStatus: true } } },
      orderBy: [{ dateOfHarvest: 'asc' }, { createdAt: 'asc' }],
    })

    const data = rows.map(r => ({
      ...r,
      container_location:    r.container?.location    ?? null,
      container_fill_status: r.container?.fillStatus  ?? null,
      container: undefined,
    }))
    return res.json({ success: true, data: toSnakeRow(data) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const getSfgInwardSummary = async (req, res) => {
  try {
    const inwards = await prisma.microbialSfgInward.findMany({
      select: { microbeCode: true, microbeName: true, microbeType: true, status: true, remainingQtyKg: true, inhouseCfuPerG: true, dateOfHarvest: true },
    })

    const grouped = {}
    for (const i of inwards) {
      const key = `${i.microbeCode}|||${i.microbeName}|||${i.microbeType}`
      if (!grouped[key]) {
        grouped[key] = { microbe_code: i.microbeCode, microbe_name: i.microbeName, microbe_type: i.microbeType, active_batches: 0, total_remaining_kg: 0, cfu_sum: 0, cfu_count: 0, latest_harvest: null }
      }
      const g = grouped[key]
      if (i.status === 'ACTIVE') {
        g.active_batches++
        g.total_remaining_kg += Number(i.remainingQtyKg)
        g.cfu_sum  += Number(i.inhouseCfuPerG)
        g.cfu_count++
        if (!g.latest_harvest || new Date(i.dateOfHarvest) > new Date(g.latest_harvest)) {
          g.latest_harvest = i.dateOfHarvest
        }
      }
    }

    const data = Object.values(grouped)
      .map(g => ({
        microbe_code:      g.microbe_code,
        microbe_name:      g.microbe_name,
        microbe_type:      g.microbe_type,
        active_batches:    g.active_batches,
        total_remaining_kg: g.total_remaining_kg,
        avg_cfu_per_g:     g.cfu_count > 0 ? g.cfu_sum / g.cfu_count : 0,
        latest_harvest:    g.latest_harvest,
      }))
      .sort((a, b) => (a.microbe_name ?? '').localeCompare(b.microbe_name ?? '') || (a.microbe_type ?? '').localeCompare(b.microbe_type ?? ''))

    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
