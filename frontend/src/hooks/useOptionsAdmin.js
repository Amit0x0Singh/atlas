import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { optionsAdminApi } from '../api/options.js'
import { queryKeys } from '../lib/queryKeys.js'
import { CACHE } from '../lib/queryClient.js'

// ─── Queries ────────────────────────────────────────────────────────────────

export function useOptionGroups() {
  return useQuery({
    queryKey: queryKeys.options.groups(),
    queryFn: () => optionsAdminApi.listGroups().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useOptionGroup(groupCode) {
  return useQuery({
    queryKey: queryKeys.options.group(groupCode),
    queryFn: () => optionsAdminApi.getGroup(groupCode).then(r => r.data),
    ...CACHE.MASTER,
    enabled: !!groupCode,
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────
// Every mutation invalidates both the admin group-detail view and the public
// values query for that group — the latter so any consuming <select> open in
// the same session (or the Settings page itself, via useOptionValues) picks
// up the change without a manual refresh.

function invalidateGroup(qc, groupCode) {
  qc.invalidateQueries({ queryKey: queryKeys.options.groups() })
  qc.invalidateQueries({ queryKey: queryKeys.options.group(groupCode) })
  qc.invalidateQueries({ queryKey: queryKeys.options.values(groupCode) })
}

export function useCreateOptionValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupCode, data }) => optionsAdminApi.createValue(groupCode, data),
    onSuccess: (_res, { groupCode }) => invalidateGroup(qc, groupCode),
  })
}

export function useUpdateOptionValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => optionsAdminApi.updateValue(id, data),
    onSuccess: (_res, { groupCode }) => invalidateGroup(qc, groupCode),
  })
}

export function useSetOptionActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }) => optionsAdminApi.setActive(id, isActive),
    onSuccess: (_res, { groupCode }) => invalidateGroup(qc, groupCode),
  })
}

export function useReorderOptionValues() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupCode, order }) => optionsAdminApi.reorderValues(groupCode, order),
    onSuccess: (_res, { groupCode }) => invalidateGroup(qc, groupCode),
  })
}
