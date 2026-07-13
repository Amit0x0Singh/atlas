import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { packingMaterialApi } from '../../api/masters.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function usePackingMaterials() {
  return useQuery({
    queryKey: queryKeys.packingMaterials.all(),
    queryFn: () => packingMaterialApi.list().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useCreatePackingMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => packingMaterialApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.packingMaterials.all() }),
  })
}

export function useUpdatePackingMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => packingMaterialApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.packingMaterials.all() }),
  })
}

export function useDeletePackingMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => packingMaterialApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.packingMaterials.all() }),
  })
}
