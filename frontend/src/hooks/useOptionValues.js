import { useQuery } from '@tanstack/react-query'
import { optionsApi } from '../api/options.js'
import { queryKeys } from '../lib/queryKeys.js'
import { CACHE } from '../lib/queryClient.js'

// Public read — active values for one admin-managed option group, in
// display order. Drop this into any <select> across the app in place of a
// hardcoded array; new/edited/deactivated options show up automatically.
export function useOptionValues(groupCode) {
  return useQuery({
    queryKey: queryKeys.options.values(groupCode),
    queryFn: () => optionsApi.list(groupCode).then(r => r.data),
    ...CACHE.MASTER,
    enabled: !!groupCode,
  })
}
