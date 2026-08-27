import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

// Recent stock loss adjustments for the "Recent Adjustments" list on the
// Stock Loss tab. The full record is in Transaction History.
export function useMicrobialAdjustments(filters) {
  return useQuery({
    queryKey: queryKeys.microbialSfgAdjustment.all(filters),
    queryFn: () => microbialSfgApi.listAdjustments(filters).then((r) => r.data),
    ...CACHE.MASTER,
  })
}

// Books a loss against one inward batch — deducts remaining_qty_kg on the
// batch and mirrors it onto the container, so every downstream view of
// microbial stock has to be invalidated (same set as useCreateOutward).
export function useCreateAdjustment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => microbialSfgApi.createAdjustment(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgAdjustment.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgInward.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgInward.summary() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgOutward.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialContainers.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgDashboard.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgHistory.all() })
      qc.invalidateQueries({ queryKey: ['microbial-sfg-storage'] })
      qc.invalidateQueries({ queryKey: ['microbial-sfg-stock-summary'] })
    },
  })
}
