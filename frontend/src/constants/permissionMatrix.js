/**
 * Presents the backend's flat `module.resource.action` permission catalog
 * (rbacApi.listPermissions()) as a friendly Module × Operation grid for the
 * Role editor — mirrors how the reference "Add New Role" screens work
 * (checkbox matrix, not a flat list of ~190 permission strings).
 *
 * Purely a frontend presentation layer: nothing here is persisted as-is —
 * checking a cell just resolves to a set of real permission keys, and
 * saving a role always sends that flat key list to the existing
 * assignPermissionsToRole/createRole endpoints. No backend concept of
 * "module" or "operation class" needs to exist beyond the catalog's own
 * `module`/`action` fields already returned by GET /admin/rbac/permissions.
 *
 * Plant scope is NOT part of this matrix — plants stay a per-user on/off
 * toggle (User.plants[]), set on the New/Edit User form, independent of
 * which module operations a role's permissions grant.
 */

// Display order + friendly labels for each catalog `module` value.
export const MODULE_ORDER = ['gate', 'inventory', 'qc', 'masters', 'planning', 'production', 'microbial', 'sales', 'admin']

export const MODULE_LABELS = {
  gate: 'Gate',
  inventory: 'Store',
  qc: 'QC',
  masters: 'Master Data',
  planning: 'Planning',
  production: 'Production',
  microbial: 'Microbial Store',
  sales: 'Sales',
  admin: 'Administration',
}

// Coarse operation columns, and which real catalog actions each one covers.
// A module/operation cell may resolve to zero keys (nothing in the catalog
// uses that action yet, e.g. Gate has no delete-adjacent action beyond
// gate.inward/outward.delete which IS covered) — the cell then renders
// disabled rather than as a clickable no-op.
export const COARSE_ACTIONS = [
  { key: 'read',   label: 'Read' },
  { key: 'write',  label: 'Write' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
  { key: 'export', label: 'Export' },
]

const ACTION_CLASS = {
  read:   ['view', 'check', 'access'],
  write:  ['create', 'issue', 'allocate', 'import', 'run', 'execute'],
  update: ['update', 'approve', 'reject', 'receive', 'adjust', 'override', 'reverse', 'cancel', 'dispatch', 'publish', 'submit', 'qc', 'assign-permissions', 'assign-role', 'manage'],
  delete: ['delete', 'disable'],
  export: ['export'],
}

/**
 * Groups the full permission catalog into { [module]: { [coarseAction]: Permission[] } }.
 * `catalog` is the flat array from GET /admin/rbac/permissions.
 */
export function buildModuleIndex(catalog) {
  const index = {}
  for (const module of MODULE_ORDER) index[module] = {}
  for (const perm of catalog) {
    if (!index[perm.module]) index[perm.module] = {} // tolerate a future module not yet in MODULE_ORDER
    for (const { key: coarse } of COARSE_ACTIONS) {
      if (!ACTION_CLASS[coarse].includes(perm.action)) continue
      ;(index[perm.module][coarse] ??= []).push(perm)
    }
  }
  return index
}

/** Cell state for a (module, coarseAction) pair given a set of currently-selected permission keys. */
export function cellState(moduleIndex, module, coarseAction, selectedKeys) {
  const perms = moduleIndex[module]?.[coarseAction] || []
  if (perms.length === 0) return { perms, checked: false, indeterminate: false, disabled: true }
  const checkedCount = perms.filter((p) => selectedKeys.has(p.key)).length
  return {
    perms,
    checked: checkedCount === perms.length,
    indeterminate: checkedCount > 0 && checkedCount < perms.length,
    disabled: false,
  }
}

/** Returns a new Set with the given cell's keys all added (checking) or all removed (unchecking). */
export function toggleCell(selectedKeys, perms, nextChecked) {
  const next = new Set(selectedKeys)
  for (const p of perms) (nextChecked ? next.add(p.key) : next.delete(p.key))
  return next
}
