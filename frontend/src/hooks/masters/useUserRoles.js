import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rbacApi } from '../../api/rbac.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.rbac.users(),
    queryFn: () => rbacApi.listUsers().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.rbac.roles(),
    queryFn: () => rbacApi.listRoles().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: queryKeys.rbac.permissions(),
    queryFn: () => rbacApi.listPermissions().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => rbacApi.createRole(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rbac.roles() }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, data }) => rbacApi.updateRole(roleId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rbac.roles() }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId) => rbacApi.deleteRole(roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rbac.roles() }),
  })
}

export function useSetRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissionKeys }) => rbacApi.setRolePermissions(roleId, permissionKeys),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rbac.roles() }),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    // Creation can assign role(s) up front (see UserFormPage), which shifts
    // those roles' `_count.users` on the Roles tab — same reasoning as
    // useSetUserRoles below.
    mutationFn: (data) => rbacApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rbac.users() })
      qc.invalidateQueries({ queryKey: queryKeys.rbac.roles() })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }) => rbacApi.updateUser(userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rbac.users() }),
  })
}

export function useSetUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }) => rbacApi.setUserActive(userId, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rbac.users() }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ userId, password }) => rbacApi.resetPassword(userId, password),
  })
}

export function useSetUserRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleIds }) => rbacApi.setUserRoles(userId, roleIds),
    // This changes which role(s) a user has, which shifts each affected
    // role's `_count.users` — the Roles tab's "Users" column (see
    // rbac.service.js's listRoles) reads `rbac.roles()`, a *separate* cache
    // key from `rbac.users()`, so it goes stale here unless both are
    // invalidated together. The DB write itself is correct the moment this
    // resolves; without this, only the Roles tab's cached count lags until
    // something else happens to refetch it — easy to mistake for the
    // assignment never having been saved at all.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rbac.users() })
      qc.invalidateQueries({ queryKey: queryKeys.rbac.roles() })
    },
  })
}
