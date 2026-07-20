import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { erpSuppliersApi } from '../../api/masters.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers.all(),
    queryFn: () => erpSuppliersApi.list().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => erpSuppliersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => erpSuppliersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() }),
  })
}
