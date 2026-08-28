import { api } from '../context/context.jsx'

// Public read — any authenticated user, active items only. This is what the
// Sales Order line-item form's Primary/Secondary Pack <datalist>s fetch.
export const packingItemsApi = {
  list: (type) => api.get('/packing-items', { params: type ? { type } : {} }),
}

// Admin write side — Settings > Packing Items management UI only.
export const packingItemsAdminApi = {
  list:      ()               => api.get('/admin/packing-items'),
  create:    (data)           => api.post('/admin/packing-items', data),
  update:    (id, data)       => api.put(`/admin/packing-items/${id}`, data),
  setActive: (id, isActive)   => api.patch(`/admin/packing-items/${id}/active`, { isActive }),
}
