import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useMicrobialOutward(filters) {
  return useQuery({
    queryKey: queryKeys.microbialSfgOutward.all(filters),
    queryFn: () => microbialSfgApi.listOutward(filters).then(r => r.data),
    ...CACHE.MASTER,
  })
}

// FEFO allocation preview — a POST under the hood (it takes a requirements
// body) but doesn't mutate stock, so it's exposed as a plain callable
// mutation the form calls on every requirement-row edit, not a cached query.
export function usePreviewOutward() {
  return useMutation({
    mutationFn: (data) => microbialSfgApi.previewOutward(data).then(r => r.data),
  })
}

// Alt-container swap picker — fetched on demand when the user clicks
// "Change" on a suggested allocation, not a standing cached query.
export function useEligibleBatches() {
  return useMutation({
    mutationFn: (microbeCode) => microbialSfgApi.eligibleBatches({ microbe_code: microbeCode }).then(r => r.data),
  })
}

export function useCreateOutward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => microbialSfgApi.createOutward(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgOutward.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgInward.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgInward.summary() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialContainers.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgDashboard.all() })
      qc.invalidateQueries({ queryKey: queryKeys.microbialSfgHistory.all() })
      qc.invalidateQueries({ queryKey: ['microbial-sfg-storage'] })
      qc.invalidateQueries({ queryKey: ['microbial-sfg-stock-summary'] })
    },
  })
}
