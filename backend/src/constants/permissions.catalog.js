/**
 * Single source of truth for every backend permission string.
 *
 * Naming convention: `module.resource.action`. This file is the only place
 * permission keys are hand-typed on the backend — router files reference
 * these keys as string literals in `authorize('...')` calls, and
 * `prisma/seed.js` upserts this exact list into the `Permission` table on
 * every seed run (safe to re-run — upsert by `key`).
 *
 * To add a new protected route: add the permission here first, re-run
 * `npx prisma db seed`, then reference the key in the router. See
 * backend/docs/RBAC.md for the full checklist.
 */

function group(module, resource, actions, describe) {
  return actions.map((action) => ({
    key: `${module}.${resource}.${action}`,
    module,
    resource,
    action,
    description: describe ? describe(action) : `${action} ${module}/${resource}`,
  }))
}

export const PERMISSIONS = [
  // ─── Admin ──────────────────────────────────────────────────────────────
  ...group('admin', 'users', ['view', 'create', 'update', 'disable', 'delete', 'assign-role']),
  ...group('admin', 'roles', ['view', 'create', 'update', 'delete', 'assign-permissions']),
  ...group('admin', 'permissions', ['view']),
  ...group('admin', 'audit', ['view']),
  ...group('admin', 'panel', ['access', 'manage'], (a) =>
    a === 'access' ? 'Read via the generic Admin Panel CRUD (all models)' : 'Create/update/delete via the generic Admin Panel CRUD (all models)'),
  ...group('admin', 'backup', ['manage']),
  ...group('admin', 'data-management', ['manage']),
  ...group('admin', 'bulk-transform', ['manage']),
  ...group('admin', 'import', ['execute']),
  // Settings — Select Options management (dropdown option groups/values
  // used across the app's forms). Reads (used by every logged-in user's
  // forms) are ungated at the route level (see routers.js) — only the
  // management screen itself needs a permission.
  ...group('admin', 'settings', ['access', 'manage'], (a) =>
    a === 'access' ? 'View the Settings / Select Options admin screen' : 'Create/update option groups and values'),

  // ─── Masters ────────────────────────────────────────────────────────────
  // Note: Packing Master, ERP Items, ERP Products, and BOM/Containers-for-
  // decanting were removed as features (deleted routers/pages) — no
  // permission entries for them.
  ...group('masters', 'rm', ['view', 'create', 'update', 'delete']),
  ...group('masters', 'product', ['view', 'create', 'update', 'delete']),
  ...group('masters', 'equipment', ['view', 'create', 'update', 'delete']),
  ...group('masters', 'recipe', ['view', 'create', 'update', 'delete']),
  ...group('masters', 'microbe', ['view', 'create', 'update', 'delete']),
  ...group('masters', 'employee', ['view', 'create', 'update', 'delete']),
  // ERP Masters module (master-data/erp-masters) — distinct resources sharing the "masters" module.
  ...group('masters', 'erp-supplier', ['view', 'create', 'update']),
  ...group('masters', 'erp-plant', ['view', 'create']),
  ...group('masters', 'erp-equipment', ['view', 'create', 'update']),
  ...group('masters', 'erp-strain', ['view', 'create']),
  ...group('masters', 'erp-customer', ['view', 'create']),
  ...group('masters', 'erp-reason-code', ['view']),

  // ─── Inventory ──────────────────────────────────────────────────────────
  ...group('inventory', 'stock', ['view']),
  ...group('inventory', 'ledger', ['view']),
  ...group('inventory', 'grn', ['view']),
  ...group('inventory', 'inward', ['view', 'create', 'delete']),
  ...group('inventory', 'outward', ['view', 'create', 'adjust'], (a) =>
    a === 'adjust' ? 'Inline stock-adjustment endpoint on the Outward screen' : `${a} outward`),
  ...group('inventory', 'containers', ['view', 'create', 'update']),
  // Note: Bulk Location and the Adjustments module (Stock Adjustments,
  // Warehouse Transfers, Decanting, FIFO Override) were removed as features
  // — no permission entries for them.

  // ─── Gate ───────────────────────────────────────────────────────────────
  ...group('gate', 'inward', ['view', 'create', 'update', 'delete']),
  ...group('gate', 'outward', ['view', 'create', 'update', 'delete']),

  // ─── Production ─────────────────────────────────────────────────────────
  ...group('production', 'tasks', ['view', 'create', 'update', 'delete']),
  ...group('production', 'batch', ['view', 'create', 'update', 'delete'], (a) =>
    a === 'delete' ? 'Delete a formulation cycle sub-record from a batch' : `${a} a production batch`),
  ...group('production', 'indent', ['view', 'create', 'update']),
  ...group('production', 'sfg', ['view', 'create', 'update']),
  // Note: the legacy BOM Issuance workflow (pending-jobs/history/issue/
  // scrap/reprocess) was removed as a feature. Not to be confused with
  // "Material Issue by BOM" (the live feature under Store Outward), which
  // is governed by inventory.outward.* and is unaffected.

  // ─── Planning ───────────────────────────────────────────────────────────
  ...group('planning', 'plan', ['view', 'create', 'submit', 'publish', 'cancel', 'reverse'], (a) =>
    a === 'reverse' ? 'Revert a published plan to draft — reserved, no endpoint exists yet' : `${a} a production plan`),
  ...group('planning', 'job', ['view', 'update', 'qc']),
  ...group('planning', 'time-motion', ['view', 'create']),
  ...group('planning', 'engine', ['view', 'run']),
  ...group('planning', 'queue', ['view']),

  // ─── Microbial ──────────────────────────────────────────────────────────
  // Note: the Microbe Master CRUD screen (microbial/sfg/master/router.js)
  // operates on the same MicrobeMaster table as masters.microbe.* above —
  // deliberately not duplicated as a separate microbial.sfg-master.* group.
  ...group('microbial', 'sfg-inward', ['view', 'create', 'update', 'import']),
  ...group('microbial', 'sfg-outward', ['view', 'create', 'update']),
  ...group('microbial', 'sfg-planning', ['view', 'create', 'update']),
  ...group('microbial', 'sfg-storage', ['view', 'create', 'update']),
  ...group('microbial', 'sfg-dashboard', ['view']),
  ...group('microbial', 'erp-container', ['view', 'create', 'update', 'allocate']),
  ...group('microbial', 'erp-transaction', ['view', 'create', 'update']),

  // ─── Sales ──────────────────────────────────────────────────────────────
  ...group('sales', 'order', ['view', 'create', 'update', 'cancel', 'dispatch', 'delete']),
  ...group('sales', 'customer-profile', ['view', 'create', 'update']),
  ...group('sales', 'bom-send', ['view', 'create', 'update', 'delete', 'issue']),
  ...group('sales', 'tracker', ['view']),
  ...group('sales', 'notification', ['view', 'update']),

  // ─── QC ─────────────────────────────────────────────────────────────────
  // Reserved — QC has no backend routes yet (the frontend's /qc-samples,
  // /qc-results, /qc-reports pages are still placeholders). Added now so the
  // Role permission matrix can already show a QC row; wire real
  // authorize('qc.sample.*') calls into the router when that module is built.
  ...group('qc', 'sample', ['view', 'create', 'update', 'delete'], (a) => `${a} a QC sample/result — reserved, no endpoint exists yet`),

  // ─── Reports / Export ─────────────────────────────────────────────────────
  // One reserved "export" permission per module — none of these are wired to
  // a real endpoint yet (the /api/export/* router is confirmed dead/
  // unmounted), but the Role permission matrix's "Export" column needs
  // something to bind to per module ahead of that work landing.
  ...group('gate', 'reports', ['export'], () => 'Export Gate inward/outward records — reserved, no endpoint exists yet'),
  ...group('inventory', 'reports', ['export'], () => 'Export Store/Inventory records — reserved, no endpoint exists yet'),
  ...group('qc', 'reports', ['export'], () => 'Export QC records — reserved, no endpoint exists yet'),
  ...group('masters', 'reports', ['export'], () => 'Export Master Data records — reserved, no endpoint exists yet'),
  ...group('planning', 'reports', ['export'], () => 'Export Planning records — reserved, no endpoint exists yet'),
  ...group('production', 'reports', ['export'], () => 'Export Production records — reserved, no endpoint exists yet'),
  ...group('microbial', 'reports', ['export'], () => 'Export Microbial Store records — reserved, no endpoint exists yet'),
  ...group('sales', 'reports', ['export'], () => 'Export Sales records — reserved, no endpoint exists yet'),
]

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key)

export function isValidPermission(key) {
  return PERMISSION_KEYS.includes(key)
}
