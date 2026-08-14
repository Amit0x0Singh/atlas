import prisma from '../db.js'
import { getCached, setCached } from '../middleware/permissionCache.js'

/**
 * Resolves a user's effective roles + permissions: UserRole -> Role ->
 * RolePermissionMap -> Permission, unioned into a flat permission-key list.
 * This is the single function both `authorize()` (middleware/auth.js) and
 * `/auth/me` (and rbac.service.js's getEffectivePermissions) call, so
 * there's exactly one place this resolution logic lives.
 *
 * Cached (see middleware/permissionCache.js) — pass `{ fresh: true }` to
 * force a DB read (used by /auth/me, which is the client's explicit
 * "check for a permission change" poll).
 */
export async function resolveEffectivePermissions(userId, { fresh = false } = {}) {
  if (!fresh) {
    const cached = getCached(userId)
    if (cached) return cached
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          name: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  })

  const roles = userRoles.map((ur) => ur.role.name)
  const permissionSet = new Set()
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) permissionSet.add(rp.permission.key)
  }

  const result = { roles, permissions: [...permissionSet] }
  setCached(userId, result)
  return result
}
