import { useQuery } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useMicrobialDashboard() {
  return useQuery({
    queryKey: queryKeys.microbialSfgDashboard.all(),
    queryFn: () => microbialSfgApi.dashboard().then(r => r.data),
    ...CACHE.MASTER,
  })
}
