import { useQuery } from '@tanstack/react-query'
import { auditLogApi } from '../../api/admin.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

// Server-paginated + server-filtered, same shape as useProducts/useEquipment
// — append-only transactional data, so CACHE.OPERATIONAL (short staleTime)
// rather than CACHE.MASTER.
export function useAuditLogs(filters) {
  return useQuery({
    queryKey: queryKeys.auditLogs.all(filters),
    queryFn: () => auditLogApi.list(filters).then((r) => ({ items: r.data, total: r.total })),
    ...CACHE.OPERATIONAL,
  })
}

export function useAuditLogMeta() {
  return useQuery({
    queryKey: queryKeys.auditLogs.meta(),
    queryFn: () => auditLogApi.meta().then((r) => r.data),
    ...CACHE.OPERATIONAL,
  })
}

export function useAuditLog(id) {
  return useQuery({
    queryKey: queryKeys.auditLogs.detail(id),
    queryFn: () => auditLogApi.get(id).then((r) => r.data),
    ...CACHE.OPERATIONAL,
    enabled: !!id,
  })
}
