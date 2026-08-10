import { api } from '../context/context.jsx'


export const planEngineApi = {
  run:           ()           => api.post('/plan-engine/run'),
  listPlans:     (params)     => api.get('/plan-engine/plans', { params }),
  getPlan:       (id)         => api.get(`/plan-engine/plans/${id}`),
  updatePlan:    (id, data)   => api.patch(`/plan-engine/plans/${id}`, data),
  cancelPlan:    (id)         => api.delete(`/plan-engine/plans/${id}`),
  dashboard:     ()           => api.get('/plan-engine/dashboard'),
  pendingOrders: ()           => api.get('/plan-engine/pending-orders'),
  logs:          ()           => api.get('/plan-engine/logs'),
}

