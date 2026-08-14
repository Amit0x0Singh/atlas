import { api } from '../context/context.jsx'

// Public read — any authenticated user, active values only. This is what
// every retrofitted <select> across the app fetches.
export const optionsApi = {
  list: (groupCode) => api.get(`/options/${groupCode}`),
}

// Admin write side — Settings > Select Options management UI only.
export const optionsAdminApi = {
  listGroups:    ()                      => api.get('/admin/options/groups'),
  getGroup:      (groupCode)             => api.get(`/admin/options/groups/${groupCode}`),
  createGroup:   (data)                  => api.post('/admin/options/groups', data),
  createValue:   (groupCode, data)       => api.post(`/admin/options/groups/${groupCode}/values`, data),
  updateValue:   (id, data)              => api.put(`/admin/options/values/${id}`, data),
  setActive:     (id, isActive)          => api.patch(`/admin/options/values/${id}/active`, { isActive }),
  reorderValues: (groupCode, order)      => api.post(`/admin/options/groups/${groupCode}/reorder`, { order }),
}
