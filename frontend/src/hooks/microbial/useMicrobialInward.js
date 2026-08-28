import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useMicrobialInward(filters) {
  return useQuery({
    queryKey: queryKeys.microbialSfgInward.all(filters),
    queryFn: () => microbialSfgApi.listInward(filters).then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useMicrobialInwardSummary() {
  return useQuery({
    queryKey: queryKeys.microbialSfgInward.summary(),
    queryFn: () => microbialSfgApi.inwardSummary().then(r => r.data),
    ...CACHE.MASTER,
  })
}

// Every container holding stock of one microbe (any fill status) — the
// container step of the Stock Loss Adjustment drill-down.
export function useSfgContainersByMicrobe(microbeCode, enabled = true) {
  return useQuery({
    queryKey: queryKeys.microbialContainers.all({ microbe_code: microbeCode || null }),
    queryFn: () => microbialSfgApi.listContainers({ microbe_code: microbeCode }).then(r => r.data),
    enabled: enabled && !!microbeCode,
    ...CACHE.MASTER,
  })
}

function invalidateStockQueries(qc) {
  qc.invalidateQueries({ queryKey: queryKeys.microbialSfgInward.all() })
  qc.invalidateQueries({ queryKey: queryKeys.microbialSfgInward.summary() })
  qc.invalidateQueries({ queryKey: queryKeys.microbialContainers.all() })
  qc.invalidateQueries({ queryKey: queryKeys.microbialSfgDashboard.all() })
  qc.invalidateQueries({ queryKey: queryKeys.microbialSfgHistory.all() })
  qc.invalidateQueries({ queryKey: ['microbial-sfg-storage'] })
  qc.invalidateQueries({ queryKey: ['microbial-sfg-stock-summary'] })
}

export function useCreateMicrobialInward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => microbialSfgApi.createInward(data),
    onSuccess: () => invalidateStockQueries(qc),
  })
}

export function useImportMicrobialInward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows) => microbialSfgApi.importInward(rows),
    onSuccess: () => invalidateStockQueries(qc),
  })
}
