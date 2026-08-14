/**
 * RBAC service layer — pure functions, no HTTP concerns. Consumed today by
 * the thin router at modules/admin/rbac/router.js; this is the surface a
 * future Admin Panel UI plugs into directly, with no backend redesign.
 *
 * Every mutation ends with the appropriate permission-cache invalidation
 * (see middleware/permissionCache.js) and a writeAudit() call — this is the
 * concrete "permission change takes effect soon" + "auditable role/user
 * management" requirement.
 */
import bcrypt from 'bcryptjs'
import prisma from '../db.js'
import { writeAudit } from '../middleware/audit.js'
import { invalidateUser, invalidateAll } from '../middleware/permissionCache.js'
import { PERMISSION_KEYS } from '../constants/permissions.catalog.js'

// ─── Roles ──────────────────────────────────────────────────────────────────

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
  })
}

export async function getRole(roleId) {
  return prisma.role.findUnique({
    where: { roleId },
    include: { permissions: { include: { permission: true } } },
  })
}

export async function createRole({ name, description, permissionKeys = [] }, actor) {
  const invalid = permissionKeys.filter((k) => !PERMISSION_KEYS.includes(k))
  if (invalid.length) throw new Error(`Unknown permission key(s): ${invalid.join(', ')}`)

  const perms = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } })
  const role = await prisma.role.create({
    data: {
      name,
      description,
      isSystem: false,
      permissions: { create: perms.map((p) => ({ permissionId: p.permissionId })) },
    },
  })
  await writeAudit({ ...actor, action: 'CREATE', tableName: 'roles', recordId: role.roleId, newValue: { name, permissionKeys } })
  return role
}

export async function updateRole(roleId, { name, description }, actor) {
  const role = await prisma.role.update({ where: { roleId }, data: { name, description } })
  await writeAudit({ ...actor, action: 'UPDATE', tableName: 'roles', recordId: roleId, newValue: { name, description } })
  return role
}

export async function deleteRole(roleId, actor) {
  const role = await prisma.role.findUnique({ where: { roleId } })
  if (!role) throw new Error('Role not found')
  if (role.isSystem) throw new Error(`"${role.name}" is a system role and cannot be deleted.`)
  const stillAssigned = await prisma.userRole.count({ where: { roleId } })
  if (stillAssigned > 0) throw new Error(`Cannot delete "${role.name}" — still assigned to ${stillAssigned} user(s).`)
  await prisma.role.delete({ where: { roleId } })
  await writeAudit({ ...actor, action: 'DELETE', tableName: 'roles', recordId: roleId, oldValue: { name: role.name } })
  invalidateAll()
}

export async function assignPermissionsToRole(roleId, permissionKeys, actor) {
  const invalid = permissionKeys.filter((k) => !PERMISSION_KEYS.includes(k))
  if (invalid.length) throw new Error(`Unknown permission key(s): ${invalid.join(', ')}`)
  const perms = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } })

  await prisma.$transaction([
    prisma.rolePermissionMap.deleteMany({ where: { roleId } }),
    prisma.rolePermissionMap.createMany({
      data: perms.map((p) => ({ roleId, permissionId: p.permissionId })),
      skipDuplicates: true,
    }),
  ])
  await writeAudit({ ...actor, action: 'UPDATE', tableName: 'role_permission_map', recordId: roleId, newValue: { permissionKeys } })
  invalidateAll() // every holder of this role is affected
}

export async function addPermissionToRole(roleId, permissionKey, actor) {
  const perm = await prisma.permission.findUnique({ where: { key: permissionKey } })
  if (!perm) throw new Error(`Unknown permission key: ${permissionKey}`)
  await prisma.rolePermissionMap.upsert({
    where: { roleId_permissionId: { roleId, permissionId: perm.permissionId } },
    update: {},
    create: { roleId, permissionId: perm.permissionId },
  })
  await writeAudit({ ...actor, action: 'UPDATE', tableName: 'role_permission_map', recordId: roleId, newValue: { added: permissionKey } })
  invalidateAll()
}

export async function removePermissionFromRole(roleId, permissionKey, actor) {
  const perm = await prisma.permission.findUnique({ where: { key: permissionKey } })
  if (!perm) throw new Error(`Unknown permission key: ${permissionKey}`)
  await prisma.rolePermissionMap.deleteMany({ where: { roleId, permissionId: perm.permissionId } })
  await writeAudit({ ...actor, action: 'UPDATE', tableName: 'role_permission_map', recordId: roleId, newValue: { removed: permissionKey } })
  invalidateAll()
}

// ─── Permissions (catalog — read-only at runtime) ─────────────────────────

export async function listPermissions({ module } = {}) {
  return prisma.permission.findMany({
    where: module ? { module } : {},
    orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
  })
}

// ─── Users ──────────────────────────────────────────────────────────────────

// Every login account with its assigned role(s) — the data the role-
// assignment UI lists and filters. No passwordHash/pinHash in the select,
// same redaction principle as the Admin Panel's REDACT map.
export async function listUsers() {
  const users = await prisma.user.findMany({
    select: {
      userId: true, email: true, username: true, fullName: true, phone: true,
      plants: true, isActive: true, createdAt: true,
      roles: { select: { role: { select: { roleId: true, name: true } } } },
    },
    orderBy: { fullName: 'asc' },
  })
  return users.map((u) => ({ ...u, roles: u.roles.map((r) => r.role) }))
}

export async function createUser({ email, username, fullName, password, plants = [], roleIds = [] }, actor) {
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      username: username || email,
      fullName,
      passwordHash,
      plants,
      isActive: true,
      roles: { create: roleIds.map((roleId) => ({ roleId })) },
    },
  })
  await writeAudit({ ...actor, action: 'CREATE', tableName: 'users', recordId: user.userId, newValue: { email, fullName, plants, roleIds } })
  return user
}

export async function updateUser(userId, { fullName, phone, plants }, actor) {
  const user = await prisma.user.update({ where: { userId }, data: { fullName, phone, plants } })
  await writeAudit({ ...actor, action: 'UPDATE', tableName: 'users', recordId: userId, newValue: { fullName, phone, plants } })
  invalidateUser(userId)
  return user
}

export async function setUserActive(userId, isActive, actor) {
  const user = await prisma.user.update({ where: { userId }, data: { isActive } })
  await writeAudit({ ...actor, action: isActive ? 'ENABLE' : 'DISABLE', tableName: 'users', recordId: userId, newValue: { isActive } })
  invalidateUser(userId) // a disable takes effect on this user's very next request
  return user
}

export async function resetUserPassword(userId, newPassword, actor) {
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { userId }, data: { passwordHash } })
  await writeAudit({ ...actor, action: 'RESET_PASSWORD', tableName: 'users', recordId: userId })
}

// Replaces a user's full role set in one call — what the role-assignment UI
// uses (rather than making the caller diff old vs new and fire N individual
// assign/remove calls itself).
export async function setUserRoles(userId, roleIds, actor) {
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    }),
  ])
  await writeAudit({ ...actor, action: 'UPDATE', tableName: 'user_roles', recordId: userId, newValue: { roleIds } })
  invalidateUser(userId)
}

export async function assignRoleToUser(userId, roleId, actor) {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  })
  await writeAudit({ ...actor, action: 'UPDATE', tableName: 'user_roles', recordId: userId, newValue: { assigned: roleId } })
  invalidateUser(userId)
}

export async function removeRoleFromUser(userId, roleId, actor) {
  await prisma.userRole.deleteMany({ where: { userId, roleId } })
  await writeAudit({ ...actor, action: 'UPDATE', tableName: 'user_roles', recordId: userId, newValue: { removed: roleId } })
  invalidateUser(userId)
}

export { resolveEffectivePermissions as getEffectivePermissions } from './permission-resolver.js'
