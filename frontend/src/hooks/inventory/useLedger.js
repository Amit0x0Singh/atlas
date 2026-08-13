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

// Transaction-type filter options — backend-sourced so the dropdown can
// never offer a value the ledger doesn't actually produce. Rarely changes,
// so cached at the MASTER tier.
export function useLedgerMeta() {
  return useQuery({
    queryKey: queryKeys.ledger.meta(),
    queryFn: () => ledgerApi.meta().then(r => r.data),
    ...CACHE.MASTER,
  })
}
