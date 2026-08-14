import { api } from '../context/context.jsx'

// Thin wrapper over /api/admin/rbac/* — the RBAC management surface (see
// backend/docs/RBAC.md). Not the full Admin Panel — just role/user
// assignment.
export const rbacApi = {
  listRoles:       ()               => api.get('/admin/rbac/roles'),
  listPermissions: ()               => api.get('/admin/rbac/permissions'),

  listUsers:       ()               => api.get('/admin/rbac/users'),
  createUser:      (data)           => api.post('/admin/rbac/users', data),
  updateUser:      (userId, data)   => api.put(`/admin/rbac/users/${userId}`, data),
  setUserActive:   (userId, isActive) => api.patch(`/admin/rbac/users/${userId}/active`, { isActive }),
  resetPassword:   (userId, password) => api.post(`/admin/rbac/users/${userId}/reset-password`, { password }),
  setUserRoles:    (userId, roleIds) => api.put(`/admin/rbac/users/${userId}/roles`, { roleIds }),
}
