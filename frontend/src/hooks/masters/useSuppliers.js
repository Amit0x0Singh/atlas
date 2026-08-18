import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { erpSuppliersApi } from '../../api/masters.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

// Filtering + pagination happen server-side — queryFn returns the current
// page's rows alongside the server-reported total match count.
export function useSuppliers(filters) {
  return useQuery({
    queryKey: queryKeys.suppliers.all(filters),
    queryFn: () => erpSuppliersApi.list(filters).then(r => ({ items: r.data, total: r.total })),
    ...CACHE.MASTER,
  })
}

// For autosuggest fields elsewhere (e.g. Gate Inward's Supplier Name) — hits
// the authenticate-only /search endpoint instead of masters.erp-supplier.view,
// since those callers are filling out a form they already have permission
// for, not browsing Supplier Master itself. Same response shape as useSuppliers().
export function useSupplierSuggestions() {
  return useQuery({
    queryKey: queryKeys.suppliers.all({ suggestions: true }),
    queryFn: () => erpSuppliersApi.search().then(r => ({ items: r.data, total: r.total })),
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
