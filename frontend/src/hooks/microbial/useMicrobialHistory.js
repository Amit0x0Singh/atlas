import { useQuery } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useMicrobialHistory(filters) {
  return useQuery({
    queryKey: queryKeys.microbialSfgHistory.all(filters),
    queryFn: () => microbialSfgApi.history(filters).then(r => r.data),
    ...CACHE.MASTER,
  })
}
