import { api } from '../context/context.jsx'


export const salesOrderApi = {
  list:         (params)     => api.get('/sales-orders', { params }),
  get:          (id)         => api.get(`/sales-orders/${id}`),
  create:       (data)       => api.post('/sales-orders', data),
  update:       (id, data)   => api.put(`/sales-orders/${id}`, data),
  patchDispatch:(id, data)   => api.patch(`/sales-orders/dispatch/${id}`, data),
  remove:       (id)         => api.delete(`/sales-orders/${id}`),
  updateItem:   (itemId, data) => api.patch(`/sales-orders/item/${itemId}`, data),
  removeItem:   (itemId)     => api.delete(`/sales-orders/item/${itemId}`),
  companies:    ()           => api.get('/sales-orders/companies'),
  addCompany:   (code, name) => api.post('/sales-orders/companies', { code, name }),
  dashboard:    ()           => api.get('/sales-orders/summary/dashboard'),
  syncLog:      ()           => api.get('/sales-orders/sync-log'),
}

export const customerProfileApi = {
  list:   ()        => api.get('/customer-profiles'),
  upsert: (data)    => api.post('/customer-profiles/upsert', data),
  seed:   (profiles) => api.post('/customer-profiles/seed', { profiles }),
}

export const cpProfileApi = {
  forCustomer: (customer) =>
    api.get('/customer-profiles/cp-profiles', { params: { customer } }),
  upsertMany:  (customerName, items) =>
    api.post('/customer-profiles/upsert-many', { customerName, items }),
}

export const bomSendApi = {
  list:         (params)                => api.get('/bom-sends', { params }),
  get:          (id)                    => api.get(`/bom-sends/${id}`),
  create:       (data)                  => api.post('/bom-sends', data),
  issuePack:    (id, data)              => api.post(`/bom-sends/${id}/issue-pack`, data),
  updateStatus: (id, status, remarks)   => api.patch(`/bom-sends/${id}/status`, { status, remarks }),
  remove:       (id)                    => api.delete(`/bom-sends/${id}`),
}

export const trackerApi = {
  searchDiNo: (diNo)     => api.get('/tracker', { params: { diNo } }),
  getDetail:  (indentId) => api.get('/tracker/detail', { params: { indentId } }),
}
