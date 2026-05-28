/**
 * ERP API Client — all new ERP module endpoints
 * Auth token stored in localStorage, auto-attached to every request
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
})

// ── Auth token interceptor ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      window.dispatchEvent(new Event('erp_logout'))
    }
    const message = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (data) => api.post('/auth/login', data),
  pinLogin:       (data) => api.post('/auth/pin-login', data),
  me:             () => api.get('/auth/me'),
  users:          () => api.get('/auth/users'),
  createUser:     (data) => api.post('/auth/users', data),
  updateUser:     (id, data) => api.patch(`/auth/users/${id}`, data),
  changePassword: (data) => api.post('/auth/change-password', data),
  roles:          () => api.get('/auth/roles'),
}

// ── ERP Masters ───────────────────────────────────────────────────────────────
export const erpItemsApi = {
  list:     (params) => api.get('/erp/masters/items', { params }),
  get:      (code)   => api.get(`/erp/masters/items/${encodeURIComponent(code)}`),
  create:   (data)   => api.post('/erp/masters/items', data),
  update:   (code, data) => api.put(`/erp/masters/items/${encodeURIComponent(code)}`, data),
}

export const erpSuppliersApi = {
  list:   () => api.get('/erp/masters/suppliers'),
  create: (data) => api.post('/erp/masters/suppliers', data),
  update: (id, data) => api.put(`/erp/masters/suppliers/${id}`, data),
}

export const erpPlantsApi = {
  list:   () => api.get('/erp/masters/plants'),
  create: (data) => api.post('/erp/masters/plants', data),
}

export const erpEquipmentApi = {
  list:   (params) => api.get('/erp/masters/equipment', { params }),
  create: (data)   => api.post('/erp/masters/equipment', data),
  patch:  (id, data) => api.patch(`/erp/masters/equipment/${id}`, data),
}

export const erpProductsApi = {
  list:   (params) => api.get('/erp/masters/erp-products', { params }),
  create: (data)   => api.post('/erp/masters/erp-products', data),
}

export const erpBomApi = {
  list:   (params) => api.get('/erp/masters/bom', { params }),
  get:    (id)     => api.get(`/erp/masters/bom/${id}`),
  create: (data)   => api.post('/erp/masters/bom', data),
}

export const erpStrainsApi = {
  list:   () => api.get('/erp/masters/strains'),
  create: (data) => api.post('/erp/masters/strains', data),
}

export const erpCustomersApi = {
  list:   () => api.get('/erp/masters/customers'),
  create: (data) => api.post('/erp/masters/customers', data),
}

export const erpReasonCodesApi = {
  list: (params) => api.get('/erp/masters/reason-codes', { params }),
}

export const erpContainersApi = {
  list:   (params) => api.get('/erp/masters/containers', { params }),
  create: (data)   => api.post('/erp/masters/containers', data),
}

// ── Gate ─────────────────────────────────────────────────────────────────────
export const gateApi = {
  // Inward
  createInward:     (data) => api.post('/erp/gate/inward', data),
  pendingReview:    () => api.get('/erp/gate/inward/pending-review'),
  quarantineCount:  () => api.get('/erp/gate/inward/quarantine-count'),
  confirmItem:      (id, data) => api.patch(`/erp/gate/inward/${id}/confirm-item`, data),
  getLabels:        (id) => api.get(`/erp/gate/inward/${id}/qr-labels`),
  scanConfirm:      (data) => api.post('/erp/gate/inward/scan-confirm', data),
  verifyScan:       (data) => api.post('/erp/gate/inward/verify-scan', data),
  inwardList:       (params) => api.get('/erp/gate/inward', { params }),
  inwardDetail:     (id) => api.get(`/erp/gate/inward/${id}`),
  // Outward
  createOutward:    (data) => api.post('/erp/gate/outward', data),
  outwardList:      (params) => api.get('/erp/gate/outward', { params }),
  // Packs
  getPack:          (packId) => api.get(`/erp/gate/packs/${packId}`),
  packList:         (params) => api.get('/erp/gate/packs', { params }),
  fifoPacks:        (itemCode) => api.get(`/erp/gate/packs/fifo/${encodeURIComponent(itemCode)}`),
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventoryApi = {
  // Adjustments
  createAdj:     (data) => api.post('/erp/inventory/adjustments', data),
  approveAdj:    (id, data) => api.patch(`/erp/inventory/adjustments/${id}/approve`, data),
  rejectAdj:     (id, data) => api.patch(`/erp/inventory/adjustments/${id}/reject`, data),
  listAdj:       (params) => api.get('/erp/inventory/adjustments', { params }),
  // Transfers
  createTransfer:   (data) => api.post('/erp/inventory/transfers', data),
  receiveTransfer:  (id, data) => api.patch(`/erp/inventory/transfers/${id}/receive`, data),
  listTransfers:    (params) => api.get('/erp/inventory/transfers', { params }),
  // Decanting
  decant:        (data) => api.post('/erp/inventory/decanting', data),
  listDecanting: (params) => api.get('/erp/inventory/decanting', { params }),
  // FIFO
  fifoCheck:     (data) => api.post('/erp/inventory/fifo-check', data),
  fifoOverride:  (data) => api.post('/erp/inventory/fifo-override', data),
  // Stock
  stockSummary:  () => api.get('/erp/inventory/stock-summary'),
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export const salesApi = {
  list:         (params) => api.get('/erp/sales/orders', { params }),
  get:          (di) => api.get(`/erp/sales/orders/${encodeURIComponent(di)}`),
  create:       (data) => api.post('/erp/sales/orders', data),
  update:       (di, data) => api.patch(`/erp/sales/orders/${encodeURIComponent(di)}`, data),
  cancel:       (di) => api.patch(`/erp/sales/orders/${encodeURIComponent(di)}/cancel`),
  dispatch:     (di, data) => api.post(`/erp/sales/orders/${encodeURIComponent(di)}/dispatch`, data),
  dispatchList: (params) => api.get('/erp/sales/dispatch', { params }),
  atRisk:       () => api.get('/erp/sales/orders/at-risk'),
  syncExcel:    () => api.post('/erp/sales/sync'),
  plannerQueue: (params) => api.get('/erp/sales/planner-queue', { params }),
}

// ── Planning ──────────────────────────────────────────────────────────────────
export const planningApi = {
  analyse:        (data) => api.post('/erp/planning/analyse', data),
  createPlan:     (data) => api.post('/erp/planning/plans', data),
  listPlans:      (params) => api.get('/erp/planning/plans', { params }),
  getPlan:        (id) => api.get(`/erp/planning/plans/${id}`),
  submitPlan:     (id) => api.patch(`/erp/planning/plans/${id}/submit`),
  publishPlan:    (id) => api.patch(`/erp/planning/plans/${id}/publish`),
  startJob:       (id) => api.patch(`/erp/planning/jobs/${id}/start`),
  delayJob:       (id, data) => api.patch(`/erp/planning/jobs/${id}/delay`, data),
  recordQC:       (id, data) => api.post(`/erp/planning/jobs/${id}/qc`, data),
  logTimeMotion:  (data) => api.post('/erp/planning/time-motion', data),
  timeMotion:     (params) => api.get('/erp/planning/time-motion', { params }),
}

// ── BOM Issuance ──────────────────────────────────────────────────────────────
export const bomIssuanceApi = {
  pendingJobs: () => api.get('/erp/bom-issuance/pending-jobs'),
  getJob:      (id) => api.get(`/erp/bom-issuance/job/${id}`),
  issue:       (data) => api.post('/erp/bom-issuance/issue', data),
  scrapJob:    (id, data) => api.post(`/erp/bom-issuance/jobs/${id}/scrap`, data),
  reprocessJob:(id) => api.post(`/erp/bom-issuance/jobs/${id}/reprocess`),
  history:     (params) => api.get('/erp/bom-issuance/history', { params }),
}

// ── Microbial ─────────────────────────────────────────────────────────────────
export const microbialApi = {
  containers:      (params) => api.get('/erp/microbial/containers', { params }),
  getContainer:    (id) => api.get(`/erp/microbial/containers/${id}`),
  createContainer: (data) => api.post('/erp/microbial/containers', data),
  updateContainer: (id, data) => api.patch(`/erp/microbial/containers/${id}`, data),
  allocate:        (data) => api.post('/erp/microbial/allocate', data),
  createTx:        (data) => api.post('/erp/microbial/transactions', data),
  confirmReceipt:  (id, data) => api.patch(`/erp/microbial/transactions/${id}/confirm-receipt`, data),
  transactions:    (params) => api.get('/erp/microbial/transactions', { params }),
  decayReport:     () => api.get('/erp/microbial/decay-report'),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifApi = {
  list:         (params) => api.get('/erp/notifications', { params }),
  markRead:     (id) => api.patch(`/erp/notifications/${id}/read`),
  markReadAll:  () => api.patch('/erp/notifications/read-all'),
  action:       (id) => api.patch(`/erp/notifications/${id}/action`),
  unreadCount:  () => api.get('/erp/notifications/unread-count'),
  adminAll:     (params) => api.get('/erp/notifications/admin/all', { params }),
  deliveryLog:  (params) => api.get('/erp/notifications/delivery-log', { params }),
}

// ── Export ────────────────────────────────────────────────────────────────────
export const exportApi = {
  salesOrders:        (params) => `${api.defaults.baseURL}/erp/export/sales-orders?${new URLSearchParams(params)}`,
  atRiskOrders:       () => `${api.defaults.baseURL}/erp/export/at-risk-orders`,
  dispatchSummary:    (params) => `${api.defaults.baseURL}/erp/export/dispatch-summary?${new URLSearchParams(params)}`,
  salesPerformance:   () => `${api.defaults.baseURL}/erp/export/sales-performance`,
  microbialStock:     () => `${api.defaults.baseURL}/erp/export/microbial-stock`,
  cfuDecay:           () => `${api.defaults.baseURL}/erp/export/cfu-decay`,
  microbialTx:        () => `${api.defaults.baseURL}/erp/export/microbial-transactions`,
  demandStockGap:     () => `${api.defaults.baseURL}/erp/export/demand-stock-gap`,
  productionSchedule: () => `${api.defaults.baseURL}/erp/export/production-schedule`,
  timeMotion:         () => `${api.defaults.baseURL}/erp/export/time-motion`,
  equipUtilisation:   () => `${api.defaults.baseURL}/erp/export/equipment-utilisation`,
  rmForecast:         () => `${api.defaults.baseURL}/erp/export/rm-forecast`,
  managementPack:     () => `${api.defaults.baseURL}/erp/export/management-pack`,
  gateInwardLog:      () => `${api.defaults.baseURL}/erp/export/gate-inward-log`,
}

// Add auth token to export download URLs
export function exportUrl(path) {
  const token = localStorage.getItem('erp_token')
  const sep = path.includes('?') ? '&' : '?'
  return token ? `${path}${sep}_token=${token}` : path
}

// ── Namespace facade ─────────────────────────────────────────────────────────
// Attaches grouped namespaces to the default axios instance so all pages can
// use the ergonomic api.inventory.*, api.masters.*, etc. pattern uniformly.

api.inventory = {
  stockSummary:      ()           => inventoryApi.stockSummary(),
  listAdjustments:   (params)     => inventoryApi.listAdj(params),
  createAdjustment:  (data)       => inventoryApi.createAdj(data),
  approveAdjustment: (id, data)   => inventoryApi.approveAdj(id, data),
  rejectAdjustment:  (id, data)   => inventoryApi.rejectAdj(id, data),
  listTransfers:     (params)     => inventoryApi.listTransfers(params),
  createTransfer:    (data)       => inventoryApi.createTransfer(data),
  receiveTransfer:   (id, data)   => inventoryApi.receiveTransfer(id, data),
  listDecanting:     (params)     => inventoryApi.listDecanting(params),
  createDecanting:   (data)       => inventoryApi.decant(data),
  fifoCheck:         (data)       => inventoryApi.fifoCheck(data),
  fifoOverride:      (data)       => inventoryApi.fifoOverride(data),
}

api.masters = {
  listItems:       (params) => erpItemsApi.list(params),
  listReasonCodes: (category) => erpReasonCodesApi.list({ category }),
  listPlants:      ()       => erpPlantsApi.list(),
  listContainers:  (code)   => erpContainersApi.list({ item_code: code }),
  listCustomers:   ()       => erpCustomersApi.list(),
  listProducts:    (params) => erpProductsApi.list(params),
}

api.gate = {
  listPacks: (params) => gateApi.packList(params),
}

api.sales = {
  listOrders:    (params)   => salesApi.list(params),
  getOrder:      (di)       => salesApi.get(di),
  createOrder:   (data)     => salesApi.create(data),
  updateOrder:   (di, data) => salesApi.update(di, data),
  atRiskOrders:  ()         => salesApi.atRisk(),
  dispatchOrder: (di, data) => salesApi.dispatch(di, data),
  syncExcel:     ()         => salesApi.syncExcel(),
}

api.planning = {
  analyse:       (data)     => planningApi.analyse(data),
  createPlan:    (data)     => planningApi.createPlan(data),
  listPlans:     (params)   => planningApi.listPlans(params),
  getPlan:       (id)       => planningApi.getPlan(id),
  submitPlan:    (id)       => planningApi.submitPlan(id),
  publishPlan:   (id)       => planningApi.publishPlan(id),
  startJob:      (id)       => planningApi.startJob(id),
  delayJob:      (id, data) => planningApi.delayJob(id, data),
  recordQc:      (id, data) => planningApi.recordQC(id, data),
  logTimeMotion: (data)     => planningApi.logTimeMotion(data),
  plannerQueue:  (params)   => salesApi.plannerQueue(params),
  timeMotion:    (params)   => planningApi.timeMotion(params),
}

api.bomIssuance = {
  pendingJobs:  ()         => bomIssuanceApi.pendingJobs(),
  getJob:       (id)       => bomIssuanceApi.getJob(id),
  issueLine:    (data)     => bomIssuanceApi.issue(data),
  scrapJob:     (id, data) => bomIssuanceApi.scrapJob(id, data),
  reprocessJob: (id)       => bomIssuanceApi.reprocessJob(id),
  history:      (params)   => bomIssuanceApi.history(params),
}

api.microbial = {
  // Strains (microbe names)
  listStrains:       ()           => erpStrainsApi.list(),
  // Containers (cold room stock)
  listContainers:    (params)     => microbialApi.containers(params),
  getContainer:      (id)         => microbialApi.getContainer(id),
  createContainer:   (data)       => microbialApi.createContainer(data),
  updateContainer:   (id, data)   => microbialApi.updateContainer(id, data),
  // Allocation (FIFO issue calculator)
  allocate:          (data)       => microbialApi.allocate(data),
  // Transactions (dispatches / issuances)
  createTransaction: (data)       => microbialApi.createTx(data),
  confirmReceipt:    (id, data)   => microbialApi.confirmReceipt(id, data),
  listTransactions:  (params)     => microbialApi.transactions(params),
  // Reports
  decayReport:       ()           => microbialApi.decayReport(),
}

export default api
