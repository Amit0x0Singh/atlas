import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { erpSuppliersApi } from '../../api/masters.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

// The endpoint's pagination is opt-in (see listSuppliers) — Supplier Master
// calls this with no page/limit to get the full list back once (cached),
// then does search/filter/sort/paginate client-side, same as Item Master.
// `filters` still passes straight through as query params if a future
// caller wants server-side filtering instead.
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
