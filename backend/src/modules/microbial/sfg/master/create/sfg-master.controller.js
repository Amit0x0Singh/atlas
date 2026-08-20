import prisma from '../../../../../db.js'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../../utils/uom.js'
import { getMaxMicrobeCodeNum, formatMicrobeCode } from '../../../../../utils/microbe-code.js'
import { writeAudit, auditUser } from '../../../../../middleware/audit.js'

export const migrateTables = async (req, res) => {
  return res.json({ success: true, message: 'Microbial SFG tables managed by Prisma — no migration needed' })
}

export const createMicrobe = async (req, res) => {
  try {
    const { microbe_name, uom } = req.body || {}
    if (!microbe_name)
      return res.status(400).json({ success: false, error: 'microbe_name is required', code: 'VALIDATION_ERROR' })

    const rawUom = uom || 'KG'
    const canonicalUom = normalizeUom(rawUom)
    if (!CANONICAL_UNITS.includes(canonicalUom))
      return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${rawUom}"`, code: 'VALIDATION_ERROR' })

    const existing = await prisma.microbeMaster.findFirst({
      where: { microbeName: { equals: microbe_name.trim(), mode: 'insensitive' } },
    })
    if (existing)
      return res.status(409).json({ success: false, error: 'Microbe name already exists', code: 'CONFLICT' })

    // microbe_code is never accepted here — computed from MAX(existing)+1.
    const nextNum = await getMaxMicrobeCodeNum(prisma)
    const row = await prisma.microbeMaster.create({
      data: { microbeName: microbe_name.trim(), microbeCode: formatMicrobeCode(nextNum + 1), uom: canonicalUom },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', module: 'masters', tableName: 'microbe_master', recordId: row.microbeCode, newValue: row })
    return res.status(201).json({ success: true, data: row })
  } catch (e) {
    if (e.code === 'P2002')
      return res.status(409).json({ success: false, error: 'Microbe code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: toSafeErrorMessage(e), code: 'INTERNAL_ERROR' })
  }
}

export const importMicrobes = async (req, res) => {
  try {
    const { rows } = req.body || {}
    if (!Array.isArray(rows) || !rows.length)
      return res.status(400).json({ success: false, error: 'rows array required', code: 'VALIDATION_ERROR' })

    let imported = 0, skipped = 0
    const errors = []
    // Computed once, then incremented in-memory per new row — a batch of
    // several new microbes in one import all need distinct, sequential codes.
    let nextNum = await getMaxMicrobeCodeNum(prisma)

    for (const r of rows) {
      const keys = Object.keys(r)
      const nameKey = keys.find(k => /microbe.?name|^name$/i.test(k))
      const uomKey  = keys.find(k => /^uom$/i.test(k))
      const name = (r.microbe_name || r['Microbe Name'] || r['MICROBE NAME'] || (nameKey ? r[nameKey] : '') || '').toString().trim()
      const rawUom = (r.uom || r['UOM'] || (uomKey ? r[uomKey] : '') || 'KG').toString().trim()

      if (!name) {
        skipped++
        errors.push({ row: JSON.stringify(r).slice(0, 80), error: 'Could not find a Microbe Name column' })
        continue
      }

      const canonicalUom = normalizeUom(rawUom)
      if (!CANONICAL_UNITS.includes(canonicalUom)) {
        skipped++
        errors.push({ row: name, error: `Unknown uom "${rawUom}" — must convert to one of ${CANONICAL_UNITS.join(', ')}` })
        continue
      }

      try {
        // microbe_code is never taken from the sheet — computed from
        // MAX(existing)+1 for new rows; existing names just get their uom refreshed.
        const existing = await prisma.microbeMaster.findFirst({
          where: { microbeName: { equals: name, mode: 'insensitive' } },
        })
        if (existing) {
          await prisma.microbeMaster.update({ where: { microbeId: existing.microbeId }, data: { uom: canonicalUom } })
        } else {
          nextNum++
          await prisma.microbeMaster.create({ data: { microbeName: name, microbeCode: formatMicrobeCode(nextNum), uom: canonicalUom } })
        }
        imported++
      } catch (e) {
        errors.push({ row: name, error: toSafeErrorMessage(e) })
        skipped++
      }
    }

    await writeAudit({ ...auditUser(req), action: 'IMPORT', module: 'masters', tableName: 'microbe_master', newValue: { imported, skipped, errorCount: errors.length } })
    return res.json({ success: true, imported, skipped, errors })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
