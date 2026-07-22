import prisma from '../../../../../db.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'
import { allocateFefo } from '../fefo.js'

async function eligibleBatches(microbeCode, excludeInwardIds = []) {
  const rows = await prisma.microbialSfgInward.findMany({
    where: {
      microbeCode, status: 'ACTIVE', remainingQtyKg: { gt: 0 },
      ...(excludeInwardIds.length ? { inwardId: { notIn: excludeInwardIds } } : {}),
    },
    include: { container: { select: { typeCode: true, inactive: true } } },
  })
  // Inactive containers are hidden from Storage Map + issuance picking, but
  // their history stays intact elsewhere (Stock Summary / History).
  return rows
    .filter((r) => !r.container?.inactive)
    .map((r) => ({ ...r, typeCode: r.container?.typeCode || r.microbeType?.slice(0, 3)?.toUpperCase() }))
}

// Preview-only FEFO computation for one or more microbe requirements — does
// not touch stock. The frontend lets the user edit suggested quantities
// before calling POST /outward to actually persist and deduct.
export const previewSfgOutward = async (req, res) => {
  try {
    const { requirements } = req.body || {}
    if (!Array.isArray(requirements) || !requirements.length)
      return res.status(400).json({ success: false, error: 'requirements array required', code: 'VALIDATION_ERROR' })

    const results = []
    for (const r of requirements) {
      const { microbe_code, required_qty_kg, required_cfu_per_g, exclude_inward_ids } = r
      if (!microbe_code || !required_qty_kg || !required_cfu_per_g) {
        results.push({ microbe_code, error: 'microbe_code, required_qty_kg, required_cfu_per_g required', allocations: [], fulfilled: false })
        continue
      }
      // exclude_inward_ids lets the frontend "remove this batch" action
      // re-run FEFO against the rest of the pool to backfill the gap,
      // instead of just shrinking the requirement — same behavior as
      // microbe.HTM's removeSugg()/recalcRemainingQty().
      const batches = await eligibleBatches(microbe_code, exclude_inward_ids || [])
      const calc = allocateFefo(batches, Number(required_qty_kg), Number(required_cfu_per_g))
      results.push({
        microbe_code,
        required_qty_kg: Number(required_qty_kg),
        required_cfu_per_g: Number(required_cfu_per_g),
        total_cfu_needed: calc.totalCfuNeeded,
        remaining_cfu: calc.remainingCfu,
        fulfilled: calc.fulfilled,
        allocations: calc.allocations,
      })
    }

    return res.json({ success: true, data: toSnakeRow(results) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// All eligible batches for one microbe, FEFO-sorted — powers the "Change
// container" swap picker in the Issuance form (openAltCont in microbe.HTM).
export const listEligibleBatches = async (req, res) => {
  try {
    const { microbe_code } = req.query
    if (!microbe_code) return res.status(400).json({ success: false, error: 'microbe_code required', code: 'VALIDATION_ERROR' })
    const batches = await eligibleBatches(microbe_code)
    const sorted = batches
      .map((b) => {
        let expiry = null
        if (b.shelfLifeDays) { expiry = new Date(b.dateOfHarvest); expiry.setDate(expiry.getDate() + b.shelfLifeDays) }
        return { inwardId: b.inwardId, containerId: b.containerId, containerCode: b.containerCode, typeCode: b.typeCode, location: b.location, biomassBatchCode: b.biomassBatchCode, dateOfHarvest: b.dateOfHarvest, expiryDate: expiry, cfuPerG: Number(b.inhouseCfuPerG), availableKg: Number(b.remainingQtyKg) }
      })
      .sort((a, b) => (a.expiryDate ?? Infinity) - (b.expiryDate ?? Infinity))
    return res.json({ success: true, data: toSnakeRow(sorted) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listSfgOutward = async (req, res) => {
  try {
    const { microbe_code, from, to } = req.query
    const where = {}
    if (from || to) {
      where.issuedAt = {}
      if (from) where.issuedAt.gte = new Date(from)
      if (to) where.issuedAt.lte = new Date(`${to}T23:59:59.999Z`)
    }
    if (microbe_code) where.lines = { some: { microbeCode: microbe_code } }

    const rows = await prisma.microbialSfgOutward.findMany({
      where,
      include: { lines: true },
      orderBy: { issuedAt: 'desc' },
    })
    return res.json({ success: true, data: toSnakeRow(rows) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getSfgOutwardById = async (req, res) => {
  try {
    const row = await prisma.microbialSfgOutward.findUnique({
      where: { outwardId: req.params.id },
      include: { lines: true },
    })
    if (!row) return res.status(404).json({ success: false, error: 'Not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: toSnakeRow(row) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Merged Inward + Outward ledger, chronological — "Transaction History".
export const getSfgHistory = async (req, res) => {
  try {
    const { microbe_code, from, to } = req.query

    const inwardWhere = {}
    const outwardLineWhere = {}
    if (microbe_code) {
      inwardWhere.microbeCode = microbe_code
      outwardLineWhere.microbeCode = microbe_code
    }
    if (from || to) {
      inwardWhere.createdAt = {}
      if (from) inwardWhere.createdAt.gte = new Date(from)
      if (to) inwardWhere.createdAt.lte = new Date(`${to}T23:59:59.999Z`)
    }

    const [inwards, outwards] = await Promise.all([
      prisma.microbialSfgInward.findMany({ where: inwardWhere, orderBy: { createdAt: 'desc' } }),
      prisma.microbialSfgOutward.findMany({
        where: (from || to) ? { issuedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {},
        include: { lines: microbe_code ? { where: outwardLineWhere } : true },
        orderBy: { issuedAt: 'desc' },
      }),
    ])

    const ledger = []
    for (const i of inwards) {
      ledger.push({
        type: 'INWARD',
        date: i.createdAt,
        microbe_code: i.microbeCode,
        microbe_name: i.microbeName,
        microbe_type: i.microbeType,
        container_code: i.containerCode,
        qty_kg: Number(i.totalQtyKg),
        cfu_per_g: Number(i.inhouseCfuPerG),
        batch_code: i.biomassBatchCode,
        location: i.location,
        status: i.status,
        ref_id: i.inwardId,
      })
    }
    for (const o of outwards) {
      if (microbe_code && !o.lines.length) continue
      for (const l of o.lines) {
        ledger.push({
          type: 'OUTWARD',
          date: o.issuedAt,
          microbe_code: l.microbeCode,
          microbe_name: l.microbeName,
          microbe_type: l.microbeType,
          container_code: l.containerCode,
          qty_kg: -Number(l.qtyIssuedKg),
          cfu_per_g: Number(l.cfuPerGAtIssue),
          batch_code: o.batchCode,
          location: null,
          status: l.isPartial ? 'PARTIAL' : 'ISSUED',
          product_name: o.productName,
          customer_name: o.customerName,
          di_number: o.diNumber,
          issuer_name: o.issuerName,
          receiver_name: o.receiverName,
          ref_id: o.outwardId,
        })
      }
    }

    ledger.sort((a, b) => new Date(b.date) - new Date(a.date))
    return res.json({ success: true, data: toSnakeRow(ledger) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
