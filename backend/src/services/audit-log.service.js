/**
 * Read-only service for the Audit Logs admin page. AuditLog rows are never
 * created here — every writer across the app calls writeAudit() directly
 * (middleware/audit.js). This module only lists/reads what's already there.
 */
import prisma from '../db.js'

const clampInt = (val, fallback, min = 1) => {
  const n = parseInt(val, 10)
  return Number.isFinite(n) && n >= min ? n : fallback
}

const SORTABLE_FIELDS = new Set(['createdAt', 'username', 'action'])

export async function listAuditLogs({ userId, action, module, tableName, recordId, ipAddress, dateFrom, dateTo, page, limit, sortField, sortDir } = {}) {
  const p = clampInt(page, 1)
  const l = clampInt(limit, 50)
  const field = SORTABLE_FIELDS.has(sortField) ? sortField : 'createdAt'
  const dir = sortDir === 'asc' ? 'asc' : 'desc'

  const where = {
    ...(userId    ? { userId } : {}),
    ...(action    ? { action } : {}),
    ...(module    ? { module } : {}),
    ...(tableName ? { tableName: { contains: tableName, mode: 'insensitive' } } : {}),
    ...(recordId  ? { recordId: { contains: recordId, mode: 'insensitive' } } : {}),
    ...(ipAddress ? { ipAddress: { contains: ipAddress, mode: 'insensitive' } } : {}),
    ...((dateFrom || dateTo) ? {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      },
    } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { [field]: dir }, skip: (p - 1) * l, take: l }),
  ])

  // BigInt id doesn't survive JSON.stringify — stringify it here once so
  // every caller (list + detail) gets a plain serializable value for free.
  return { items: items.map((r) => ({ ...r, id: r.id.toString() })), total, page: p, limit: l }
}

export async function getAuditLog(id) {
  const row = await prisma.auditLog.findUnique({ where: { id: BigInt(id) } })
  return row ? { ...row, id: row.id.toString() } : null
}

// Distinct action/module/tableName values seen so far — powers the Audit
// Logs page's filter dropdowns without hand-maintaining a static list.
export async function listAuditLogFilterMeta() {
  const [actions, modules, tables] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
    prisma.auditLog.findMany({ distinct: ['module'], select: { module: true }, where: { module: { not: null } }, orderBy: { module: 'asc' } }),
    prisma.auditLog.findMany({ distinct: ['tableName'], select: { tableName: true }, where: { tableName: { not: null } }, orderBy: { tableName: 'asc' } }),
  ])
  return {
    actions: actions.map((r) => r.action),
    modules: modules.map((r) => r.module),
    tables: tables.map((r) => r.tableName),
  }
}
