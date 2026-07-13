import { useQuery } from '@tanstack/react-query'
import { grnApi } from '../../api/inventory.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useGrnList() {
  return useQuery({
    queryKey: queryKeys.grn.all(),
    queryFn: () => grnApi.list().then(r => r.data),
    ...CACHE.OPERATIONAL,
  })
}
