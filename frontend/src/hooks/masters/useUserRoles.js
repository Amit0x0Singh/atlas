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

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => rbacApi.createUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rbac.users() }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rbac.users() }),
  })
}
