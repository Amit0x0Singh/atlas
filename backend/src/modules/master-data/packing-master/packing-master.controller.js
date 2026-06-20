import prisma from '../../../db.js'

export async function listPackingMaterials(req, res) {
  try {
    const items = await prisma.packingMaterial.findMany({
      where: { isActive: true },
      orderBy: [{ packingType: 'asc' }, { itemName: 'asc' }],
    })
    return res.json({ success: true, data: items })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createPackingMaterial(req, res) {
  try {
    const {
      itemCode, itemName, packingType, material,
      capacity, capacityUnit, length, width, height,
      ply, shape, color, uom,
    } = req.body

    if (!itemCode || !itemName || !packingType) {
      return res.status(400).json({ success: false, error: 'itemCode, itemName, and packingType are required' })
    }

    const item = await prisma.packingMaterial.create({
      data: {
        itemCode: itemCode.trim().toUpperCase(),
        itemName: itemName.trim(),
        packingType,
        material:     material     || null,
        capacity:     capacity     ? parseFloat(capacity)  : null,
        capacityUnit: capacityUnit || null,
        length:       length       ? parseFloat(length)    : null,
        width:        width        ? parseFloat(width)     : null,
        height:       height       ? parseFloat(height)    : null,
        ply:          ply          ? parseInt(ply)         : null,
        shape:        shape        || null,
        color:        color        || null,
        uom:          uom          || 'Nos',
      },
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Item code already exists' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updatePackingMaterial(req, res) {
  try {
    const { id } = req.params
    const {
      itemCode, itemName, packingType, material,
      capacity, capacityUnit, length, width, height,
      ply, shape, color, uom,
    } = req.body

    const item = await prisma.packingMaterial.update({
      where: { id },
      data: {
        itemCode:     itemCode?.trim().toUpperCase(),
        itemName:     itemName?.trim(),
        packingType,
        material:     material     || null,
        capacity:     capacity     ? parseFloat(capacity)  : null,
        capacityUnit: capacityUnit || null,
        length:       length       ? parseFloat(length)    : null,
        width:        width        ? parseFloat(width)     : null,
        height:       height       ? parseFloat(height)    : null,
        ply:          ply          ? parseInt(ply)         : null,
        shape:        shape        || null,
        color:        color        || null,
        uom:          uom          || 'Nos',
      },
    })
    return res.json({ success: true, data: item })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Item code already exists' })
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deletePackingMaterial(req, res) {
  try {
    await prisma.packingMaterial.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
