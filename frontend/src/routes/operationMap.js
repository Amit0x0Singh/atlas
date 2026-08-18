// Maps route path prefixes to the permission required to view them, mirroring
// the per-route `authorize('module.resource.action')` checks now enforced by
// the backend (see backend/src/middleware/auth.js and
// backend/src/constants/permissions.catalog.js). No entry = accessible to
// any authenticated account. A user holding the permission for a prefix can
// view it regardless of which role granted it — there's no more special-cased
// "admin bypass"; Super Admin simply holds every permission.
export const PERMISSION_ROUTES = [
  { prefix: '/gate',            permission: 'gate.inward.view' },
  { prefix: '/erp/gate',        permission: 'gate.inward.view' },

  { prefix: '/inward',          permission: 'inventory.inward.view' },
  { prefix: '/outward',         permission: 'inventory.outward.view' },
  { prefix: '/containers',      permission: 'inventory.containers.view' },
  { prefix: '/ledger',          permission: 'inventory.ledger.view' },
  { prefix: '/grn',             permission: 'inventory.grn.view' },
  { prefix: '/indent',          permission: 'production.indent.view' },
  { prefix: '/print-master',    permission: 'inventory.inward.view' },

  { prefix: '/erp/microbial',   permission: 'microbial.erp-container.view' },
  { prefix: '/microbial-inward', permission: 'microbial.erp-container.view' },
  { prefix: '/microbe-transaction', permission: 'microbial.erp-transaction.view' },
  { prefix: '/microbes-dashboard',  permission: 'microbial.sfg-dashboard.view' },
  { prefix: '/planning',        permission: 'planning.plan.view' },
  { prefix: '/erp/planning',    permission: 'planning.plan.view' },
  { prefix: '/erp/bom',         permission: 'production.bom-issuance.view' },
  { prefix: '/tracker',         permission: 'sales.tracker.view' },
  { prefix: '/production',      permission: 'production.batch.view' },
  { prefix: '/sfg-store',       permission: 'microbial.sfg-storage.view' },
  { prefix: '/sfg',             permission: 'production.sfg.view' },

  // Sales Orders is management's — not something the inventory/store team
  // should see or edit.
  { prefix: '/sales-orders',    permission: 'sales.order.view' },

  // Dashboard and the RM Material stock overview are also visible to the
  // store team (read access to overall stock/production numbers is useful
  // for them).
  { prefix: '/stock',           permission: 'inventory.stock.view' },
  { prefix: '/rm-material',     permission: 'inventory.stock.view' },

  // Master Data and Data Import stay admin-only — view and edit.
  { prefix: '/rm-master',       permission: 'masters.rm.view' },
  { prefix: '/product-master',  permission: 'masters.product.view' },
  { prefix: '/equipment-master', permission: 'masters.equipment.view' },
  { prefix: '/supplier-master',  permission: 'masters.erp-supplier.view' },
  { prefix: '/employee-master', permission: 'masters.employee.view' },
  { prefix: '/user-roles',      permission: 'admin.users.view' },
  { prefix: '/recipe',          permission: 'masters.recipe.view' },
  { prefix: '/microbes-master', permission: 'masters.microbe.view' },
  { prefix: '/import',          permission: 'admin.import.execute' },
  { prefix: '/settings',        permission: 'admin.settings.access' },
  { prefix: '/audit-logs',      permission: 'admin.audit.view' },
]

// Longest matching prefix wins, so more specific routes (e.g. /erp/microbial)
// take priority over broader ones (e.g. /erp) if both were ever present.
export function permissionForPath(pathname) {
  const hit = PERMISSION_ROUTES
    .filter(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]
  return hit?.permission || null
}

// Where to land a user after login / at "/". Checked in order — the first
// permission the user holds wins. Broad admin-type accounts (which hold
// every permission, including the narrow ones below) are matched first so
// they keep landing on the general Stock dashboard rather than the first,
// most-specific rule (Gate) that would otherwise match.
const DEFAULT_PATH_RULES = [
  { permission: 'admin.panel.access',      path: '/stock' },
  { permission: 'gate.inward.view',        path: '/gate' },
  { permission: 'inventory.inward.view',   path: '/inward' },
  { permission: 'planning.plan.view',      path: '/planning' },
  { permission: 'production.batch.view',   path: '/production' },
  { permission: 'sales.order.view',        path: '/sales-orders' },
  { permission: 'inventory.stock.view',    path: '/stock' },
]

export function defaultPathForUser(user) {
  const perms = new Set(user?.permissions || [])
  for (const rule of DEFAULT_PATH_RULES) {
    if (perms.has(rule.permission)) return rule.path
  }
  return '/stock'
}
