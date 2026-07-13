import { useQuery } from '@tanstack/react-query'
import { customerProfileApi } from '../../api/sales.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useCustomerProfiles() {
  return useQuery({
    queryKey: queryKeys.customerProfiles.all(),
    queryFn: () => customerProfileApi.list().then(r => r.data),
    ...CACHE.MASTER,
  })
}
