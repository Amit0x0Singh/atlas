import { useQuery } from '@tanstack/react-query'
import { microbialSfgApi } from '../../api/microbial.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

// Read-only — used to tell whether a microbe currently has stock (any
// container with qty > 0), so Microbe Master can block deleting one that's
// actively in use instead of orphaning real inventory records.
export function useMicrobialContainers() {
  return useQuery({
    queryKey: queryKeys.microbialContainers.all(),
    queryFn: () => microbialSfgApi.listContainers().then(r => r.data),
    ...CACHE.MASTER,
  })
}
