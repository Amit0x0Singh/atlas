import prisma from '../db.js'

// ── Page catalogue: every page that exists in the system ─────────────────────
export const ALL_PAGES = [
  // Masters
  { path: '/item-master',       label: 'Item Master',       group: 'Masters' },
  { path: '/product-master',    label: 'Product Master',    group: 'Masters' },
  { path: '/equipment-master',  label: 'Equipment Master',  group: 'Masters' },
  { path: '/recipe-db',         label: 'Recipe DB',         group: 'Masters' },
  { path: '/location-master',   label: 'Location Master',   group: 'Masters' },
  { path: '/employee-master',   label: 'Employee Master',   group: 'Masters' },
  // Warehouse
  { path: '/inward',            label: 'Inward',            group: 'Warehouse' },
  { path: '/outward',           label: 'Outward',           group: 'Warehouse' },
  { path: '/stock',             label: 'Stock',             group: 'Warehouse' },
  { path: '/ledger',            label: 'Ledger',            group: 'Warehouse' },
  // Production
  { path: '/indent',            label: 'Indent',            group: 'Production' },
  { path: '/production',        label: 'Production',        group: 'Production' },
  { path: '/sfg',               label: 'SFG',               group: 'Production' },
  { path: '/tracker',           label: 'Tracker',           group: 'Production' },
  // Sales & Planning
  { path: '/sales-orders',      label: 'Sales Orders',      group: 'Sales' },
  { path: '/planning',          label: 'Planning',          group: 'Planning' },
  // Admin
  { path: '/grn',               label: 'GRN',               group: 'Admin' },
  { path: '/import',            label: 'Import',            group: 'Admin' },
]

// ── Default permissions per role ─────────────────────────────────────────────
const ROLE_DEFAULTS = {
  ADMIN:      ALL_PAGES.map(p => p.path),
  SALES:      ['/sales-orders', '/tracker', '/stock'],
  PRODUCTION: ['/indent', '/production', '/sfg', '/stock', '/outward', '/planning', '/tracker'],
  QC:         ['/production', '/sfg', '/stock', '/tracker'],
  DISPATCH:   ['/sales-orders', '/stock', '/sfg', '/tracker'],
  PLANNING:   ['/sales-orders', '/indent', '/planning', '/stock', '/recipe-db', '/tracker'],
  ACCOUNTS:   ['/sales-orders', '/grn', '/tracker'],
}

export default async function employeeRoutes(fastify) {

  // ── GET /api/erp/employees  ───────────────────────────────────────────────
  fastify.get('/', async (req) => {
    const { role, section, active } = req.query
    const where = {}
    if (role)   where.role    = role
    if (section) where.section = section
    if (active !== undefined) where.isActive = active === 'true'

    const employees = await prisma.employeeMaster.findMany({
      where,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
    return { success: true, data: employees }
  })

  // ── GET /api/erp/employees/pages  ────────────────────────────────────────
  fastify.get('/pages', async () => {
    return { success: true, data: ALL_PAGES }
  })

  // ── GET /api/erp/employees/role-defaults  ────────────────────────────────
  fastify.get('/role-defaults', async () => {
    return { success: true, data: ROLE_DEFAULTS }
  })

  // ── GET /api/erp/employees/permissions/:role  ────────────────────────────
  fastify.get('/permissions/:role', async (req) => {
    const { role } = req.params
    const perms = await prisma.rolePermission.findMany({ where: { role } })
    return { success: true, data: perms }
  })

  // ── GET /api/erp/employees/:id  ──────────────────────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const emp = await prisma.employeeMaster.findUnique({ where: { id: req.params.id } })
    if (!emp) return reply.status(404).send({ success: false, error: 'Employee not found' })
    return { success: true, data: emp }
  })

  // ── POST /api/erp/employees  ─────────────────────────────────────────────
  fastify.post('/', async (req, reply) => {
    const { name, email, phone, role, section } = req.body
    if (!name || !role) return reply.status(400).send({ success: false, error: 'name and role required' })

    // Auto-generate emp code: EMP-001, EMP-002 …
    const count = await prisma.employeeMaster.count()
    const empCode = `EMP-${String(count + 1).padStart(3, '0')}`

    const emp = await prisma.employeeMaster.create({
      data: { empCode, name, email: email || null, phone: phone || null, role, section: section || null }
    })
    return { success: true, data: emp }
  })

  // ── PUT /api/erp/employees/:id  ──────────────────────────────────────────
  fastify.put('/:id', async (req, reply) => {
    const { name, email, phone, role, section, isActive } = req.body
    const emp = await prisma.employeeMaster.update({
      where: { id: req.params.id },
      data: {
        ...(name      !== undefined && { name }),
        ...(email     !== undefined && { email: email || null }),
        ...(phone     !== undefined && { phone: phone || null }),
        ...(role      !== undefined && { role }),
        ...(section   !== undefined && { section: section || null }),
        ...(isActive  !== undefined && { isActive }),
      }
    })
    return { success: true, data: emp }
  })

  // ── DELETE /api/erp/employees/:id  ───────────────────────────────────────
  fastify.delete('/:id', async (req) => {
    // Soft-delete
    await prisma.employeeMaster.update({ where: { id: req.params.id }, data: { isActive: false } })
    return { success: true }
  })

  // ── POST /api/erp/employees/permissions/save  ────────────────────────────
  // Body: { role, pagePaths: ['/indent', '/production', ...] }
  fastify.post('/permissions/save', async (req, reply) => {
    const { role, pagePaths } = req.body
    if (!role || !Array.isArray(pagePaths))
      return reply.status(400).send({ success: false, error: 'role and pagePaths required' })

    // Delete existing, recreate
    await prisma.rolePermission.deleteMany({ where: { role } })

    const pageMap = Object.fromEntries(ALL_PAGES.map(p => [p.path, p.label]))
    await prisma.rolePermission.createMany({
      data: pagePaths.map(path => ({ role, pagePath: path, pageLabel: pageMap[path] || path }))
    })
    return { success: true, message: `Permissions saved for ${role}` }
  })

  // ── POST /api/erp/employees/permissions/seed-defaults  ───────────────────
  // Seeds default permissions for all roles (run once or to reset)
  fastify.post('/permissions/seed-defaults', async () => {
    const pageMap = Object.fromEntries(ALL_PAGES.map(p => [p.path, p.label]))
    let total = 0
    for (const [role, paths] of Object.entries(ROLE_DEFAULTS)) {
      await prisma.rolePermission.deleteMany({ where: { role } })
      await prisma.rolePermission.createMany({
        data: paths.map(path => ({ role, pagePath: path, pageLabel: pageMap[path] || path }))
      })
      total += paths.length
    }
    return { success: true, message: `Seeded ${total} permission rows` }
  })

  // ── Company Master ────────────────────────────────────────────────────────

  fastify.get('/companies/list', async () => {
    const companies = await prisma.companyMaster.findMany({ orderBy: { code: 'asc' } })
    return { success: true, data: companies }
  })

  fastify.post('/companies', async (req, reply) => {
    const { code, name } = req.body
    if (!code || !name) return reply.status(400).send({ success: false, error: 'code and name required' })
    const company = await prisma.companyMaster.upsert({
      where: { code },
      create: { code: code.toUpperCase(), name },
      update: { name }
    })
    return { success: true, data: company }
  })

  fastify.delete('/companies/:code', async (req) => {
    await prisma.companyMaster.update({ where: { code: req.params.code }, data: { isActive: false } })
    return { success: true }
  })
}
