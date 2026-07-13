import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { salesOrderApi } from '../../api/sales.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useSalesOrders(filters) {
  return useQuery({
    queryKey: queryKeys.salesOrders.all(filters),
    queryFn: () => salesOrderApi.list(filters).then(r => r.data),
    ...CACHE.OPERATIONAL,
  })
}

export function useSalesOrder(id) {
  return useQuery({
    queryKey: queryKeys.salesOrders.detail(id),
    queryFn: () => salesOrderApi.get(id).then(r => r.data),
    ...CACHE.OPERATIONAL,
    enabled: !!id,
  })
}

export function useCreateSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => salesOrderApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all() }),
  })
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => salesOrderApi.update(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all() })
      qc.invalidateQueries({ queryKey: queryKeys.salesOrders.detail(id) })
    },
  })
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => salesOrderApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all() }),
  })
}
