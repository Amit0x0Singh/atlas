import prisma from '../../../../db.js'

export const listPackingMaterials = async (req, res) => {
  try {
    const items = await prisma.packingMaterial.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
    })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
