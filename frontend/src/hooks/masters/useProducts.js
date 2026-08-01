import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productApi } from '../../api/masters.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

// Filtering + pagination happen server-side — queryFn returns the current
// page's rows alongside the server-reported total match count.
export function useProducts(filters) {
  return useQuery({
    queryKey: queryKeys.products.all(filters),
    queryFn: () => productApi.list(filters).then(r => ({ items: r.data, total: r.total })),
    ...CACHE.MASTER,
  })
}

export function useProductFilterMeta() {
  return useQuery({
    queryKey: queryKeys.products.meta(),
    queryFn: () => productApi.meta().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useProduct(code) {
  return useQuery({
    queryKey: queryKeys.products.detail(code),
    queryFn: () => productApi.get(code).then(r => r.data),
    ...CACHE.MASTER,
    enabled: !!code,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => productApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products.all() }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, data }) => productApi.update(code, data),
    onSuccess: (_res, { code }) => {
      qc.invalidateQueries({ queryKey: queryKeys.products.all() })
      qc.invalidateQueries({ queryKey: queryKeys.products.detail(code) })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code) => productApi.delete(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products.all() }),
  })
}
