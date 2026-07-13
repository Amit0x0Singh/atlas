import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bulkApi } from '../../api/inventory.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useLocations() {
  return useQuery({
    queryKey: queryKeys.locations.all(),
    queryFn: () => bulkApi.listLocations().then(r => r.data),
    ...CACHE.MASTER,
  })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => bulkApi.createLocation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.locations.all() }),
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (locationId) => bulkApi.deleteLocation(locationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.locations.all() }),
  })
}
