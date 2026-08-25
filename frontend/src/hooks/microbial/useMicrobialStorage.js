import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useStorageGrid() {
  return useQuery({
    queryKey: queryKeys.microbialSfgStorage.grid(),
    queryFn: () => microbialSfgApi.storageGrid().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useContainerBatches(containerId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.microbialSfgContainers.batches(containerId),
    queryFn: () => microbialSfgApi.containerBatches(containerId).then(r => r.data),
    enabled: enabled && !!containerId,
    ...CACHE.MASTER,
  })
}

export function useAvailableSlots(params, enabled = true) {
  return useQuery({
    queryKey: queryKeys.microbialSfgStorage.availableSlots(params),
    queryFn: () => microbialSfgApi.availableSlots(params).then(r => r.data),
    enabled,
    ...CACHE.MASTER,
  })
}

function invalidateAfterContainerLifecycleChange(qc) {
  qc.invalidateQueries({ queryKey: ['microbial-sfg-storage'] })
  qc.invalidateQueries({ queryKey: ['microbial-sfg-stock-summary'] })
  qc.invalidateQueries({ queryKey: queryKeys.microbialContainers.all() })
  qc.invalidateQueries({ queryKey: queryKeys.microbialSfgDashboard.all() })
}

export function useMarkContainerInactive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => microbialSfgApi.markContainerInactive(id),
    onSuccess: () => invalidateAfterContainerLifecycleChange(qc),
  })
}

export function useReactivateContainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => microbialSfgApi.reactivateContainer(id),
    onSuccess: () => invalidateAfterContainerLifecycleChange(qc),
  })
}
