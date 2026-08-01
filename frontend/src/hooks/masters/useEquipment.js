import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { equipmentApi } from '../../api/masters.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

// Filtering + pagination happen server-side — queryFn returns the current
// page's rows alongside the server-reported total match count.
export function useEquipment(filters) {
  return useQuery({
    queryKey: queryKeys.equipment.all(filters),
    queryFn: () => equipmentApi.list(filters).then(r => ({ items: r.data, total: r.total })),
    ...CACHE.MASTER,
  })
}

export function useEquipmentFilterMeta() {
  return useQuery({
    queryKey: queryKeys.equipment.meta(),
    queryFn: () => equipmentApi.meta().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useCreateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => equipmentApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.equipment.all() }),
  })
}

export function useUpdateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => equipmentApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.equipment.all() }),
  })
}

export function useDeleteEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => equipmentApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.equipment.all() }),
  })
}
