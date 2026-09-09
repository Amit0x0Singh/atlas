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
  // Material Indent (the request form) is open to every authenticated user —
  // any plant/section person raises indents to the Store. No entry here so
  // permissionForPath('/material-indent') stays null. The Store-side issuing
  // workflow lives under /outward and keeps its own gate.
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

// Where to land after login / at "/" / on any unknown route — the same
// /home welcome page for EVERY account, admins included. /home is always
// accessible (no entry in PERMISSION_ROUTES, so permissionForPath('/home')
// is null); from there each account uses the sidebar / the page's own
// quick-launch cards to reach whatever it has permission for.
export function defaultPathForUser() {
  return '/home'
}
