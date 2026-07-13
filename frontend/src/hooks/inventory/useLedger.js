import { useQuery } from '@tanstack/react-query'
import { ledgerApi } from '../../api/inventory.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useLedger(filters) {
  return useQuery({
    queryKey: queryKeys.ledger.all(filters),
    queryFn: () => ledgerApi.all(filters).then(r => ({ rows: r.data || [], total: r.total || 0 })),
    ...CACHE.OPERATIONAL,
  })
}
