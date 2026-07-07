import prisma from '../../../../../db.js'

export const updateContainerCapacity = async (req, res) => {
  const { containerId } = req.params
  const { capacity } = req.body
  const newCapacity = parseFloat(capacity)
  if (!capacity || Number.isNaN(newCapacity) || newCapacity <= 0)
    return res.status(400).json({ success: false, error: 'capacity must be a positive number', code: 'VALIDATION_ERROR' })

  try {
    const container = await prisma.containerMaster.findUnique({ where: { containerId: decodeURIComponent(containerId) } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })

    if (newCapacity < container.currentQty)
      return res.status(400).json({
        success: false,
        error: `New capacity (${newCapacity} ${container.uom}) can't be less than current stock (${container.currentQty} ${container.uom}) — issue out stock first`,
        code: 'VALIDATION_ERROR',
      })

    const updated = await prisma.containerMaster.update({
      where: { containerId: container.containerId },
      data: { capacity: newCapacity },
    })
    return res.json({ success: true, data: updated })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
