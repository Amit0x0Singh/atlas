# RBAC Architecture

Granular, permission-based access control. Replaces the old flat-file
`access.js` (deleted) and its two-axis `role` (admin/employee) ×
`operation` (gate/store/production/admin) check.

## 1. Model

```
User → UserRole → Role → RolePermissionMap → Permission
```

- **User** (`prisma/model/system/system.prisma`) — real login identity.
  `passwordHash` is bcrypt. `plants: String[]` is this app's one real
  "scope" concept — `[]` means unscoped (sees/acts on every plant),
  non-empty restricts to those plant tags. `role` (singular, string) is a
  deprecated legacy column, kept but unused — don't read or write it.
- **Role** (`prisma/model/system/rbac.prisma`) — a named, reusable
  permission bundle ("Store Manager", "Gate Viewer", ...). `isSystem: true`
  marks the 8 roles seeded to cover the legacy accounts — a future Admin
  Panel should block deleting/renaming those.
- **Permission** — a catalog row shaped `module.resource.action`
  (`inventory.inward.create`). The catalog lives at
  `backend/src/constants/permissions.catalog.js` and is the **only** place
  permission strings are hand-typed — everywhere else references a key from
  it.
- **RolePermissionMap** / **UserRole** — join tables. `User`↔`Role` is
  many-to-many from day one (a person can hold more than one role) even
  though every seeded account has exactly one.

Note: a *different*, pre-existing table also named `RolePermission`
(`prisma/model/hr/hr.prisma`) is unrelated — it backs a disconnected
page-path permission editor tied to the (unmounted) HR module. Left alone
deliberately; don't confuse the two.

## 2. Backend authorization flow

```
Request → JWT verify → load User → resolve effective permissions → authorize(key) → controller
```

- `backend/src/middleware/auth.js` — `authenticate` verifies the JWT
  (payload is just `{ sub: userId }`, nothing else), loads the `User` row,
  401s if missing/inactive. `authorize(permissionKey)` (or an array —
  OR-matched) calls `authenticate` then checks
  `req.user.permissions.has(key)`, 403 otherwise. There's no
  `operation === 'admin'` special case anywhere — Super Admin is just a
  role holding every permission.
- `backend/src/services/permission-resolver.js` — `resolveEffectivePermissions(userId)`
  does the `UserRole → Role → RolePermissionMap → Permission` join, cached
  ~45s in-process (`middleware/permissionCache.js`) since this app runs as
  a single Node instance. Every RBAC-mutating call in `rbac.service.js`
  invalidates the affected user's cache entry (or all entries, for a
  role-wide permission change) as its last step — that's the "a permission
  change takes effect soon" mechanism. `/auth/me` always resolves fresh
  (bypasses the cache) — it's the client's explicit "check for a change"
  poll.
- `backend/src/middleware/scope.js` — plant-scope enforcement, applied only
  to the few resources that carry a `plant`/`section` column
  (`production/tasks`, `production/indent`). `scopeWhereByPlant` narrows a
  list query; `requirePlantInScope` 403s a client-supplied out-of-scope
  plant on write; `requireRecordPlantInScope` 403s a by-ID route whose
  record belongs to a plant outside the caller's scope (the ID-bypass fix).

Error shape is always `{ success: false, error: "...", code: "UNAUTHORIZED" | "FORBIDDEN" }`.

## 3. Frontend

- `frontend/src/context/context.jsx` — `login()`/`/auth/me` store
  `{ userId, email, username, fullName, plants, roles, permissions }` in
  `localStorage['erp_user']`. Exposes `hasPermission`/`hasAnyPermission`/`hasAllPermissions`.
  Calls `/auth/me` on mount + window `focus` to pick up a permission change
  without forcing re-login.
- `frontend/src/components/common/Can.jsx` — `<Can permission="...">` (also
  `anyOf`/`allOf`) hides its child by default; `mode="disable"` greys it out
  with a reason instead — use that on workflow pages where seeing *why*
  something is unavailable matters (e.g. an Approve/Dispatch button).
- `frontend/src/routes/operationMap.js` — `PERMISSION_ROUTES` (path
  prefix → permission, longest-prefix match) drives both route guarding
  (`routes.jsx`'s `AppLayout`) and sidebar filtering (`menu-bar.jsx`) — one
  source of truth for both.
- `frontend/src/components/common/AccessDenied.jsx` — the standard
  "Access Restricted" experience. `variant="page"` for a blocked route,
  `variant="inline"` anywhere else (e.g. as `<Can>`'s `fallback`).

## 4. Adding a new protected backend route

1. Add the permission key(s) to `backend/src/constants/permissions.catalog.js`
   (`module.resource.action`, matching the route's folder name).
2. Re-run `npx prisma db seed` — idempotent, safe against a running dev DB.
   Attach the new key to whichever seed role(s) in `roles.seed.js` should
   have it.
3. `authorize('module.resource.action')` on the route in its router file —
   replaces the old `authenticate, authorize(['operation'])` pair.
4. If the resource carries a `plant`/`section` column, wire
   `requirePlantInScope`/`requireRecordPlantInScope`/`scopeWhereByPlant`
   from `middleware/scope.js`.
5. If the action is a real state transition worth tracking (approve,
   delete-all, role/permission change), add a `writeAudit()` call — see the
   pattern in `middleware/audit.js` and its ~20 existing call sites. Don't
   add it to routine create/read traffic; that's intentionally out of
   scope.

## 5. Adding a new protected frontend page/nav item

1. Add the path → permission mapping to `PERMISSION_ROUTES` in
   `frontend/src/routes/operationMap.js`.
2. Wrap conditionally-available buttons/actions in
   `<Can permission="...">` (or `mode="disable"` for approval-style
   controls).
3. Nothing else needed for the sidebar — `menu-bar.jsx` derives visibility
   from the same `PERMISSION_ROUTES` table automatically.

## 6. Troubleshooting

- **"I granted a permission but the user still gets 403"** — the change
  needs the affected user's next request after the role's cache entry is
  invalidated (immediate for the specific mutating admin action, otherwise
  up to the ~45s TTL). On the frontend, calling `/auth/me` again (window
  focus, or a manual refresh) picks it up without re-login.
- **"A brand-new permission key is unauthorized-for-everyone"** — the
  catalog entry alone doesn't grant it to any role; you still need to
  attach it to a role in `roles.seed.js` and reseed, or use the RBAC
  service (`assignPermissionsToRole`) to add it to a live role.

## 7. Explicitly out of scope this pass

- **Admin Panel UI** — a future phase. The backend is shaped for it
  already: `backend/src/services/rbac.service.js` (pure functions:
  create/update/delete role, assign/remove permissions, create/disable
  user, assign/remove role, get effective permissions) plus a thin
  pass-through HTTP surface at `/api/admin/rbac/*`
  (`backend/src/modules/admin/rbac/router.js`) that nothing in the
  frontend calls yet.
- **The legacy `RolePermission` table / HR "Role Permissions" editor** —
  left fully alone; tied to the still-unmounted HR router
  (`backend/src/routers/routers.js` has `// router.use("/", HRRouter)`
  commented out) and a disconnected UI tab in
  `frontend/src/pages/hr/employee/page/EmployeeMaster.jsx`. Not part of
  this RBAC system.
- **HR (`/api/employees/*`) and Export (`/api/export/*`) routers** — both
  confirmed dead/unmounted before this work and left that way. Re-enabling
  either later is a one-line uncomment in `routers.js` plus the same
  mechanical `authorize('module.resource.action')` swap described above —
  the catalog already reserves `masters.employee.*` for this.
