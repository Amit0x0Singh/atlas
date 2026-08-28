import { api } from '../context/context.jsx'


export const microbialSfgApi = {
  // Microbe master
  listMicrobes:       ()        => api.get('/microbial-sfg/masters/microbes'),
  // Autosuggest lookup (Microbial Inward, Production's BOM issuance) — same
  // data/shape as listMicrobes(), just authenticate-only instead of gated
  // by masters.microbe.view, since these callers are filling out a form
  // they already have permission for, not browsing Microbe Master.
  searchMicrobes:     ()        => api.get('/microbial-sfg/masters/microbes/search'),
  createMicrobe:      (data)    => api.post('/microbial-sfg/masters/microbes', data),
  updateMicrobe:      (id, d)   => api.put(`/microbial-sfg/masters/microbes/${id}`, d),
  deleteMicrobe:      (id)      => api.delete(`/microbial-sfg/masters/microbes/${id}`),
  importMicrobes:     (rows)    => api.post('/microbial-sfg/masters/microbes/import', { rows }),
  // Containers
  listContainers:     (params)  => api.get('/microbial-sfg/inward/containers', { params }),
  availableContainers:(params)  => api.get('/microbial-sfg/inward/containers/available', { params }),
  nextContainerCode:  (params)  => api.get('/microbial-sfg/inward/containers/next-code', { params }),
  containerBatches:   (id)      => api.get(`/microbial-sfg/inward/containers/${id}/batches`),
  // Inward
  listInward:         (params)  => api.get('/microbial-sfg/inward', { params }),
  createInward:       (data)    => api.post('/microbial-sfg/inward', data),
  updateInward:       (id, d)   => api.put(`/microbial-sfg/inward/${id}`, d),
  importInward:       (rows)    => api.post('/microbial-sfg/inward/import', { rows }),
  inwardSummary:      ()        => api.get('/microbial-sfg/inward/summary'),
  // Planning integration
  checkPlanMicrobes:  (planId, mf) =>
    api.get(`/microbial-sfg/planning/check/${planId}`, { params: { multiplication_factor: mf } }),
  productMicrobes:    (params)  => api.get('/microbial-sfg/planning/product-microbes', { params }),
  allocate:           (data)    => api.post('/microbial-sfg/planning/allocate', data),
  listAllocations:    (planId)  => api.get(`/microbial-sfg/planning/allocations/${planId}`),
  cancelAllocation:   (id)      => api.delete(`/microbial-sfg/planning/allocations/${id}`),
  // Outward / Issuance
  previewOutward:     (data)    => api.post('/microbial-sfg/outward/preview', data),
  createOutward:      (data)    => api.post('/microbial-sfg/outward', data),
  listOutward:        (params)  => api.get('/microbial-sfg/outward', { params }),
  getOutward:         (id)      => api.get(`/microbial-sfg/outward/${id}`),
  // Stock loss adjustment (biomass lost during issuance / production release / transport)
  listAdjustments:    (params)  => api.get('/microbial-sfg/adjustment', { params }),
  createAdjustment:   (data)    => api.post('/microbial-sfg/adjustment', data),
  // History (merged inward + outward + adjustment ledger)
  history:            (params)  => api.get('/microbial-sfg/history', { params }),
  // Executive dashboard (KPIs, health score, reorder signals, velocity, ABC, dormancy, insights, decisions)
  dashboard:          ()        => api.get('/microbial-sfg/dashboard'),
  // Storage — real rack/shelf/side/position slot grid
  storageGrid:        ()        => api.get('/microbial-sfg/storage/grid'),
  availableSlots:     (params)  => api.get('/microbial-sfg/storage/available-slots', { params }),
  markContainerInactive: (id)   => api.patch(`/microbial-sfg/storage/containers/${id}/inactive`),
  reactivateContainer:   (id)   => api.patch(`/microbial-sfg/storage/containers/${id}/reactivate`),
  // Stock Summary
  microbeWiseSummary: ()        => api.get('/microbial-sfg/stock-summary/microbe-wise'),
  containerLedger:    ()        => api.get('/microbial-sfg/stock-summary/container-ledger'),
  // Alt-container swap picker (Issuance)
  eligibleBatches:    (params)  => api.get('/microbial-sfg/outward/eligible-batches', { params }),
  // In-progress issuance sessions — resumable if the page is left mid-issuance
  outwardSessions: {
    list:   ()         => api.get('/microbial-sfg/outward/sessions'),
    upsert: (id, data) => api.put(`/microbial-sfg/outward/sessions/${encodeURIComponent(id)}`, data),
    delete: (id)       => api.delete(`/microbial-sfg/outward/sessions/${encodeURIComponent(id)}`),
  },
}


export const microbialApi = {
  containers:      (params)     => api.get('/microbial/containers', { params }),
  getContainer:    (id)         => api.get(`/microbial/containers/${id}`),
  createContainer: (data)       => api.post('/microbial/containers', data),
  updateContainer: (id, data)   => api.patch(`/microbial/containers/${id}`, data),
  allocate:        (data)       => api.post('/microbial/allocate', data),
  createTx:        (data)       => api.post('/microbial/transactions', data),
  confirmReceipt:  (id, data)   => api.patch(`/microbial/transactions/${id}/confirm-receipt`, data),
  transactions:    (params)     => api.get('/microbial/transactions', { params }),
  decayReport:     ()           => api.get('/microbial/decay-report'),
}
