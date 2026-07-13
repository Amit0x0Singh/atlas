import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rmApi } from '../../api/inventory.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useRmMaster(filters) {
  return useQuery({
    queryKey: queryKeys.rmMaster.all(filters),
    queryFn: () => rmApi.list(filters).then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useRmItem(code) {
  return useQuery({
    queryKey: queryKeys.rmMaster.detail(code),
    queryFn: () => rmApi.get(code).then(r => r.data),
    ...CACHE.MASTER,
    enabled: !!code,
  })
}

export function useCreateRm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => rmApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rmMaster.all() }),
  })
}

export function useUpdateRm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, data }) => rmApi.update(code, data),
    onSuccess: (_res, { code }) => {
      qc.invalidateQueries({ queryKey: queryKeys.rmMaster.all() })
      qc.invalidateQueries({ queryKey: queryKeys.rmMaster.detail(code) })
    },
  })
}

export function useDeleteRm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code) => rmApi.delete(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rmMaster.all() }),
  })
}
