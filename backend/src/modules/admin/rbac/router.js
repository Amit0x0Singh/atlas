/**
 * Thin HTTP surface over rbac.service.js — pure pass-throughs, no business
 * logic here. NOT the Admin Panel UI (nothing in the frontend calls this
 * yet); exists so a future Admin Panel needs zero backend changes to manage
 * employees/roles/permissions. See backend/docs/RBAC.md.
 */
import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import { auditUser } from '../../../middleware/audit.js'
import * as rbac from '../../../services/rbac.service.js'
import { toSafeErrorMessage } from '../../../utils/safe-error.js';

const RbacRouter = express.Router()

const wrap = (fn) => async (req, res) => {
  try {
    const result = await fn(req)
    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(err), code: 'VALIDATION_ERROR' })
  }
}

// ── Roles ───────────────────────────────────────────────────────────────────
RbacRouter.get('/roles', authorize('admin.roles.view'), wrap(() => rbac.listRoles()))
RbacRouter.get('/roles/:roleId', authorize('admin.roles.view'), wrap((req) => rbac.getRole(req.params.roleId)))
RbacRouter.post('/roles', authorize('admin.roles.create'), wrap((req) => rbac.createRole(req.body, auditUser(req))))
RbacRouter.put('/roles/:roleId', authorize('admin.roles.update'), wrap((req) => rbac.updateRole(req.params.roleId, req.body, auditUser(req))))
RbacRouter.delete('/roles/:roleId', authorize('admin.roles.delete'), wrap((req) => rbac.deleteRole(req.params.roleId, auditUser(req))))
RbacRouter.put('/roles/:roleId/permissions', authorize('admin.roles.assign-permissions'), wrap((req) => rbac.assignPermissionsToRole(req.params.roleId, req.body.permissionKeys || [], auditUser(req))))
RbacRouter.post('/roles/:roleId/permissions/:permissionKey', authorize('admin.roles.assign-permissions'), wrap((req) => rbac.addPermissionToRole(req.params.roleId, req.params.permissionKey, auditUser(req))))
RbacRouter.delete('/roles/:roleId/permissions/:permissionKey', authorize('admin.roles.assign-permissions'), wrap((req) => rbac.removePermissionFromRole(req.params.roleId, req.params.permissionKey, auditUser(req))))

// ── Permissions (catalog, read-only) ────────────────────────────────────────
RbacRouter.get('/permissions', authorize('admin.permissions.view'), wrap((req) => rbac.listPermissions({ module: req.query.module })))

// ── Users ────────────────────────────────────────────────────────────────────
RbacRouter.get('/users', authorize('admin.users.view'), wrap(() => rbac.listUsers()))
RbacRouter.post('/users', authorize('admin.users.create'), wrap((req) => rbac.createUser(req.body, auditUser(req))))
RbacRouter.put('/users/:userId', authorize('admin.users.update'), wrap((req) => rbac.updateUser(req.params.userId, req.body, auditUser(req))))
RbacRouter.patch('/users/:userId/active', authorize('admin.users.disable'), wrap((req) => rbac.setUserActive(req.params.userId, !!req.body.isActive, auditUser(req))))
RbacRouter.post('/users/:userId/reset-password', authorize('admin.users.update'), wrap((req) => rbac.resetUserPassword(req.params.userId, req.body.password, auditUser(req))))
RbacRouter.put('/users/:userId/roles', authorize('admin.users.assign-role'), wrap((req) => rbac.setUserRoles(req.params.userId, req.body.roleIds || [], auditUser(req))))
RbacRouter.post('/users/:userId/roles/:roleId', authorize('admin.users.assign-role'), wrap((req) => rbac.assignRoleToUser(req.params.userId, req.params.roleId, auditUser(req))))
RbacRouter.delete('/users/:userId/roles/:roleId', authorize('admin.users.assign-role'), wrap((req) => rbac.removeRoleFromUser(req.params.userId, req.params.roleId, auditUser(req))))
RbacRouter.get('/users/:userId/effective-permissions', authorize('admin.users.view'), wrap((req) => rbac.getEffectivePermissions(req.params.userId, { fresh: true })))

export default RbacRouter
