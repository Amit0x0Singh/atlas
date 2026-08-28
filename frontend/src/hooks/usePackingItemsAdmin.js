import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { packingItemsAdminApi } from '../api/packingItems.js'
import { queryKeys } from '../lib/queryKeys.js'
import { CACHE } from '../lib/queryClient.js'

// ─── Query ──────────────────────────────────────────────────────────────────
// Every packing item incl. inactive — for the Settings > Packing Items table.
export function usePackingItemsAdmin() {
  return useQuery({
    queryKey: queryKeys.packingItems.admin(),
    queryFn: () => packingItemsAdminApi.list().then(r => r.data),
    ...CACHE.MASTER,
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────
// All invalidate the ['packing-items'] prefix — covers the admin list AND
// every public byType query (so a <datalist> open in the same session, or the
// Settings table itself, picks up the change without a manual refresh).
function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: queryKeys.packingItems.all() })
}

export function useCreatePackingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => packingItemsAdminApi.create(data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdatePackingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => packingItemsAdminApi.update(id, data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useSetPackingItemActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }) => packingItemsAdminApi.setActive(id, isActive),
    onSuccess: () => invalidateAll(qc),
  })
}
