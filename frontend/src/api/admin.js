import { api } from '../context/context.jsx'

// Thin wrapper over /api/admin/audit/* — read-only Audit Logs surface
// (see backend/src/services/audit-log.service.js). Gated by admin.audit.view.
export const auditLogApi = {
  list: (params) => api.get('/admin/audit', { params }),
  meta: () => api.get('/admin/audit/meta'),
  get:  (id) => api.get(`/admin/audit/${id}`),
}
