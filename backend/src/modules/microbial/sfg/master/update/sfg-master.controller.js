import prisma from '../../../../../db.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../../utils/uom.js'

export const updateMicrobe = async (req, res) => {
  try {
    const { microbe_name, uom } = req.body || {}
    // microbe_code is never accepted here — it's backend-generated at
    // creation time and never changes afterwards.
    const data = {}
    if (microbe_name) data.microbeName = microbe_name.trim()
    if (uom) {
      const canonicalUom = normalizeUom(uom)
      if (!CANONICAL_UNITS.includes(canonicalUom))
        return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })
      data.uom = canonicalUom
    }

    const row = await prisma.microbeMaster.update({
      where: { microbeId: req.params.id },
      data,
    })
    return res.json({ success: true, data: row })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ success: false, error: 'Microbe not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}
