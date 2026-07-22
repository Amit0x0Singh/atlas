import { useQuery } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useMicrobeWiseSummary() {
  return useQuery({
    queryKey: queryKeys.microbialSfgStockSummary.microbeWise(),
    queryFn: () => microbialSfgApi.microbeWiseSummary().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useContainerLedger() {
  return useQuery({
    queryKey: queryKeys.microbialSfgStockSummary.containerLedger(),
    queryFn: () => microbialSfgApi.containerLedger().then(r => r.data),
    ...CACHE.MASTER,
  })
}
