import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useMicrobes() {
  return useQuery({
    queryKey: queryKeys.microbes.all(),
    queryFn: () => microbialSfgApi.listMicrobes().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useCreateMicrobe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => microbialSfgApi.createMicrobe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.microbes.all() }),
  })
}

export function useUpdateMicrobe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => microbialSfgApi.updateMicrobe(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.microbes.all() }),
  })
}

export function useDeleteMicrobe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => microbialSfgApi.deleteMicrobe(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.microbes.all() }),
  })
}
