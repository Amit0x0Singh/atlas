import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { equipmentApi } from '../../api/masters.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useEquipment() {
  return useQuery({
    queryKey: queryKeys.equipment.all(),
    queryFn: () => equipmentApi.list().then(r => r.data),
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
