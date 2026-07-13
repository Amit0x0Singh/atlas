import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { employeeApi } from '../../api/hr.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

// ─── Queries ────────────────────────────────────────────────────────────────

export function useEmployees(filters) {
  return useQuery({
    queryKey: queryKeys.employees.all(filters),
    queryFn: () => employeeApi.list(filters).then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useEmployee(id) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => employeeApi.get(id).then(r => r.data),
    ...CACHE.MASTER,
    enabled: !!id,
  })
}

export function useEmployeePages() {
  return useQuery({
    queryKey: queryKeys.employees.pages(),
    queryFn: () => employeeApi.listPages().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useEmployeeRoleDefaults() {
  return useQuery({
    queryKey: queryKeys.employees.roleDefaults(),
    queryFn: () => employeeApi.roleDefaults().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useEmployeePermissions(role) {
  return useQuery({
    queryKey: queryKeys.employees.permissions(role),
    queryFn: () => employeeApi.getPermissions(role).then(r => r.data),
    ...CACHE.MASTER,
    enabled: !!role,
  })
}

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.employees.companies(),
    queryFn: () => employeeApi.listCompanies().then(r => r.data),
    ...CACHE.MASTER,
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => employeeApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employees.all() }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => employeeApi.update(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all() })
      qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) })
    },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => employeeApi.remove(id),
    // Optimistic removal — the row disappears immediately instead of
    // waiting on the round-trip; rolled back on failure.
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.employees.all() })
      const previous = qc.getQueryData(queryKeys.employees.all())
      qc.setQueryData(queryKeys.employees.all(), (old) => old?.filter((e) => e.id !== id))
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(queryKeys.employees.all(), context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.employees.all() }),
  })
}

export function useSavePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ role, pagePaths }) => employeeApi.savePermissions(role, pagePaths),
    onSuccess: (_res, { role }) => qc.invalidateQueries({ queryKey: queryKeys.employees.permissions(role) }),
  })
}

export function useAddCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => employeeApi.addCompany(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employees.companies() }),
  })
}
