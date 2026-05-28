// routes/customer-product-profiles.js
// Customer-Product Profile memory layer
// Key: (customerName, productName) — productName = customer-facing product name
import prisma from '../db.js'

export default async function customerProductProfileRoutes(fastify) {

  // GET /api/cp-profiles?customer=NAME
  // Returns all product profiles for a given customer, ordered by most ordered
  fastify.get('/', async (req) => {
    const { customer } = req.query
    if (!customer) return { success: true, data: [] }
    const profiles = await prisma.customerProductProfile.findMany({
      where: { customerName: customer.trim().toUpperCase() },
      orderBy: { orderCount: 'desc' },
    })
    return { success: true, data: profiles }
  })

  // POST /api/cp-profiles/upsert-many
  // Called when a sales order is saved — upserts one profile per line item
  fastify.post('/upsert-many', async (req, reply) => {
    const { customerName, items } = req.body
    if (!customerName || !Array.isArray(items))
      return reply.status(400).send({ success: false, error: 'customerName and items[] required' })

    const name = customerName.trim().toUpperCase()
    let saved = 0

    for (const it of items) {
      // Require at least one of customerProductName or inhouseProductName
      const pname = (it.customerProductName || it.productName || '').trim()
      if (!pname) continue

      // Calculate shelf life from mfgDate + expDate if both provided
      let shelfLifeDays = null
      if (it.mfgDate && it.expDate) {
        const diff = Math.round((new Date(it.expDate) - new Date(it.mfgDate)) / 86400000)
        if (diff > 0) shelfLifeDays = diff
      }

      const update = {
        productCode:   it.inhouseProductCode || it.productCode || null,
        inhouseName:   it.inhouseProductName || null,
        activeSpecs:   it.activeSpecs   || null,
        carrier:       it.carrier       || null,
        sectionName:   it.sectionName   || null,
        unitQty:       it.unitQty       ? parseFloat(it.unitQty)   : null,
        unitUom:       it.unitUom       || null,
        unitPackType:  it.unitPackType  || null,
        primaryPack:   it.primaryPack   || it.unitPackType || null,
        secondaryPack: it.secondaryPack || it.packingType  || null,
        unitsPerCS:    it.unitsPerCS    ? parseInt(it.unitsPerCS)  : null,
        totalUom:      it.totalUom      || 'KG',
        labelType:     it.labelType     || null,
        mrp:           it.mrp           ? parseFloat(it.mrp)       : null,
        lastBatchNo:   it.batchNo       || null,
        ...(shelfLifeDays ? { shelfLifeDays } : {}),
        orderCount:    { increment: 1 },
        lastOrderedAt: new Date(),
      }

      const key = { customerName_productName: { customerName: name, productName: pname } }

      const existing = await prisma.customerProductProfile.findUnique({ where: key })

      if (existing) {
        await prisma.customerProductProfile.update({ where: key, data: update })
      } else {
        await prisma.customerProductProfile.create({
          data: {
            customerName:  name,
            productName:   pname,
            productCode:   it.inhouseProductCode || it.productCode || null,
            inhouseName:   it.inhouseProductName || null,
            activeSpecs:   it.activeSpecs   || null,
            carrier:       it.carrier       || null,
            sectionName:   it.sectionName   || null,
            unitQty:       it.unitQty       ? parseFloat(it.unitQty)  : null,
            unitUom:       it.unitUom       || null,
            unitPackType:  it.unitPackType  || null,
            primaryPack:   it.primaryPack   || it.unitPackType || null,
            secondaryPack: it.secondaryPack || it.packingType  || null,
            unitsPerCS:    it.unitsPerCS    ? parseInt(it.unitsPerCS) : null,
            totalUom:      it.totalUom      || 'KG',
            labelType:     it.labelType     || null,
            mrp:           it.mrp           ? parseFloat(it.mrp)      : null,
            lastBatchNo:   it.batchNo       || null,
            shelfLifeDays,
            orderCount:    1,
          }
        })
      }
      saved++
    }
    return { success: true, saved }
  })
}
