import prisma from '../db.js'

export default async function customerProfileRoutes(fastify) {

  // GET /api/customer-profiles — all profiles (for dropdown)
  fastify.get('/', async (req, reply) => {
    const profiles = await prisma.customerProfile.findMany({
      orderBy: [{ orderCount: 'desc' }, { customerName: 'asc' }],
    })
    return { success: true, data: profiles }
  })

  // POST /api/customer-profiles/upsert — called when a SO is saved
  // Updates profile from real order data (most trusted source)
  fastify.post('/upsert', async (req, reply) => {
    const { customerName, company, orderType } = req.body
    if (!customerName?.trim()) return reply.status(400).send({ success: false, error: 'customerName required' })

    const existing = await prisma.customerProfile.findUnique({
      where: { customerName: customerName.trim().toUpperCase() }
    })

    if (existing) {
      // Increment count and update fields (real order data wins over Excel seed)
      await prisma.customerProfile.update({
        where: { customerName: customerName.trim().toUpperCase() },
        data: {
          company:    company   || existing.company,
          orderType:  orderType || existing.orderType,
          orderCount: { increment: 1 },
        }
      })
    } else {
      await prisma.customerProfile.create({
        data: {
          customerName: customerName.trim().toUpperCase(),
          company:   company   || '',
          orderType: orderType || 'DOMESTIC',
          orderCount: 1,
        }
      })
    }
    return { success: true }
  })

  // POST /api/customer-profiles/seed — bulk seed from Excel import
  fastify.post('/seed', async (req, reply) => {
    const { profiles } = req.body   // [{ customerName, company, orderType, orderCount }]
    if (!Array.isArray(profiles)) return reply.status(400).send({ success: false, error: 'profiles array required' })

    let created = 0, updated = 0
    for (const p of profiles) {
      if (!p.customerName?.trim()) continue
      const name = p.customerName.trim().toUpperCase()
      const existing = await prisma.customerProfile.findUnique({ where: { customerName: name } })
      if (existing) {
        // Only update if seed has more data points (i.e. real orders override Excel)
        if (p.orderCount > existing.orderCount) {
          await prisma.customerProfile.update({
            where: { customerName: name },
            data: { company: p.company || existing.company, orderType: p.orderType || existing.orderType, orderCount: p.orderCount }
          })
          updated++
        }
      } else {
        await prisma.customerProfile.create({
          data: { customerName: name, company: p.company || '', orderType: p.orderType || 'DOMESTIC', orderCount: p.orderCount || 1 }
        })
        created++
      }
    }
    return { success: true, created, updated }
  })
}
