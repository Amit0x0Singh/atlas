import { useQuery } from '@tanstack/react-query'
import { containerApi } from '../../../../../api/inventory.js'
import { queryKeys } from '../../../../../lib/queryKeys.js'
import { CACHE } from '../../../../../lib/queryClient.js'

// Same shape as the old useState/useEffect hook so ContainerList (and any
// future consumer) needs no changes — only the fetching mechanism moved to
// TanStack Query underneath.
export function useContainers(itemCode) {
  const query = useQuery({
    queryKey: queryKeys.containers.all(itemCode ? { itemCode } : undefined),
    queryFn: () => containerApi.list(itemCode ? { itemCode } : undefined).then(r => r.data || []),
    ...CACHE.OPERATIONAL,
  })

  return {
    containers: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? '',
    reload: query.refetch,
  }
}
