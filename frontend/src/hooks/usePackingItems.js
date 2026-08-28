import { useQuery } from '@tanstack/react-query'
import { packingItemsApi } from '../api/packingItems.js'
import { queryKeys } from '../lib/queryKeys.js'
import { CACHE } from '../lib/queryClient.js'

// Public read — active packing items for one type ('PRIMARY' | 'SECONDARY'),
// name-sorted. Feeds the Sales Order line-item form's pack suggestion
// <datalist>s; new/edited/deactivated items show up automatically.
export function usePackingItems(type) {
  return useQuery({
    queryKey: queryKeys.packingItems.byType(type),
    queryFn: () => packingItemsApi.list(type).then(r => r.data),
    ...CACHE.MASTER,
    enabled: !!type,
  })
}
