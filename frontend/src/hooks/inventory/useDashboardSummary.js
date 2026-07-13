import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { stockApi, rmApi } from '../../api/inventory.js'
import { salesOrderApi } from '../../api/sales.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useDashboardSummary(period) {
  return useQuery({
    queryKey: queryKeys.stock.dashboard(period),
    queryFn: () => stockApi.dashboard(period).then(r => r.data),
    ...CACHE.DASHBOARD,
    // Dashboards are the one place "feels live" beats "avoid refetching" —
    // opt this query back into focus-refetch rather than flipping the
    // global default (which would undo the whole point of this migration).
    refetchOnWindowFocus: true,
  })
}

// Dashboard → RM Material / Sales Orders are the pages users open right
// after checking the dashboard — warm their caches in the background (e.g.
// on hover/mount of the dashboard's nav links) so navigating feels instant
// instead of showing a fresh loading spinner.
export function usePrefetchDashboardLinks() {
  const qc = useQueryClient()

  const prefetchInventory = useCallback(() => {
    qc.prefetchQuery({
      queryKey: queryKeys.rmMaster.all(),
      queryFn: () => rmApi.list({}).then(r => r.data),
      ...CACHE.MASTER,
    })
  }, [qc])

  const prefetchSalesOrders = useCallback(() => {
    qc.prefetchQuery({
      queryKey: queryKeys.salesOrders.all(),
      queryFn: () => salesOrderApi.list().then(r => r.data),
      ...CACHE.OPERATIONAL,
    })
  }, [qc])

  return { prefetchInventory, prefetchSalesOrders }
}
