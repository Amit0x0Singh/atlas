import { api } from '../context/context.jsx'


export const rmApi = {
  list:       (params)     => api.get('/rm', { params }),
  // Autosuggest lookup (Print Master, Store Container creation, Recipe BOM
  // editor, Production's BOM issuance) — same data/shape as list(), just
  // authenticate-only instead of gated by masters.rm.view, since these
  // callers are filling out a form they already have permission for, not
  // browsing Item Master.
  search:     (params)     => api.get('/rm/search', { params }),
  get:        (code)       => api.get(`/rm/${code}`),
  create:     (data)       => api.post('/rm', data),
  update:     (code, data) => api.put(`/rm/${code}`, data),
  delete:     (code)       => api.delete(`/rm/${code}`),
  warehouses: ()           => api.get('/rm/warehouses'),
}

export const packsApi = {
  generate:       (data)            => api.post('/packs/generate', data),
  list:           (params)          => api.get('/packs', { params }),
  get:            (packId)          => api.get(`/packs/${encodeURIComponent(packId)}`),
  nextLot:        (itemCode)        => api.get(`/packs/next-lot/${itemCode}`),
  pendingInward:  ()                => api.get('/packs/pending-inward'),
  labelUrl:       (packId)          => `/api/packs/label/${encodeURIComponent(packId)}`,
  batchLabelsUrl: (itemCode, lotNo) => `/api/packs/labels/lot/${itemCode}/${encodeURIComponent(lotNo)}`,
  // `groups` — [{ itemCode, lotNo }] — merges labels from multiple lots
  // (e.g. several items generated in one Print Master submission) into a
  // single PDF; `download` forces a Content-Disposition attachment.
  batchLabelsMultiUrl: (groups, { download = false } = {}) =>
    `/api/packs/labels/batch?pairs=${encodeURIComponent(JSON.stringify(groups))}${download ? '&download=1' : ''}`,
}

// Scan/submit are scoped by (itemCode, lotNo) — one Print Master header —
// instead of a separately-created session id; there's nothing to "create"
// before scanning, so getLotProgress doubles as the old createSession call.
export const inwardApi = {
  getLotProgress: (itemCode, lotNo)               => api.get(`/inward/lots/${encodeURIComponent(itemCode)}/${encodeURIComponent(lotNo)}`),
  scan:           (itemCode, lotNo, packId, warehouse) => api.post(`/inward/lots/${encodeURIComponent(itemCode)}/${encodeURIComponent(lotNo)}/scan`, { packId, warehouse }),
  batchScan:      (itemCode, lotNo, packIds, warehouse) => api.post(`/inward/lots/${encodeURIComponent(itemCode)}/${encodeURIComponent(lotNo)}/batch-scan`, { packIds, warehouse }),
  removeScan:     (itemCode, lotNo, packId)       => api.delete(`/inward/lots/${encodeURIComponent(itemCode)}/${encodeURIComponent(lotNo)}/scan/${encodeURIComponent(packId)}`),
  submit:         (itemCode, lotNo, warehouse)    => api.post(`/inward/lots/${encodeURIComponent(itemCode)}/${encodeURIComponent(lotNo)}/submit`, { warehouse }),
  lotsInProgress: ()                              => api.get('/inward/lots/in-progress'),
  history:        (params)                        => api.get('/inward', { params }),
}

export const outwardApi = {
  bomScan:             (data)    => api.post('/outward/bom-scan', data),
  bomManual:           (data)    => api.post('/outward/bom-manual', data),
  availablePacks:      (rmCode)  => api.get(`/outward/available/${encodeURIComponent(rmCode)}`),
  getPack:             (packId)  => api.get(`/outward/pack/${encodeURIComponent(packId)}`),
  packReduction:       (data)    => api.post('/outward/pack-reduction', data),
  stockAdjustment:     (data)    => api.post('/outward/stock-adjustment', data),
  lossAdjustment:      (data)    => api.post('/outward/loss-adjustment', data),
  containerLossAdjustment: (data) => api.post('/outward/container-loss-adjustment', data),
  warehouseTransfer:   (data)    => api.post('/outward/warehouse-transfer', data),
  directIssue:         (data)    => api.post('/outward/direct-issue', data),
  bomDirect:           (data)    => api.post('/outward/bom-direct', data),
  history:             (params)  => api.get('/outward', { params }),
  bomSessions: {
    list:   ()         => api.get('/outward/bom-sessions'),
    upsert: (id, data) => api.put(`/outward/bom-sessions/${encodeURIComponent(id)}`, data),
    delete: (id)        => api.delete(`/outward/bom-sessions/${encodeURIComponent(id)}`),
  },
}

export const sfgApi = {
  list:    (params) => api.get('/sfg', { params }),
  listAll: (params) => api.get('/sfg', { params: { ...params, showAll: 'true' } }),
  get:     (sfgId)  => api.get(`/sfg/${sfgId}`),
  summary: ()       => api.get('/sfg/summary'),
  update:  (sfgId, data) => api.put(`/sfg/${sfgId}`, data),
}

export const containerApi = {
  list:            (params)      => api.get('/containers', { params }),
  get:             (id)          => api.get(`/containers/${encodeURIComponent(id)}`),
  create:          (data)        => api.post('/containers', data),
  fill:            (id, data)    => api.post(`/containers/${encodeURIComponent(id)}/fill`, data),
  issue:           (id, data)    => api.post(`/containers/${encodeURIComponent(id)}/issue`, data),
  updateCapacity:  (id, capacity) => api.patch(`/containers/${encodeURIComponent(id)}/capacity`, { capacity }),
  labelUrl:        (id)          => `/api/containers/${encodeURIComponent(id)}/label`,
}

export const stockApi = {
  summary:    (params)   => api.get('/stock', { params }),
  item:       (itemCode) => api.get(`/stock/${itemCode}`),
  containers: ()         => api.get('/stock/containers'),
  dashboard:  (period)   => api.get('/stock/dashboard', { params: { period } }),
  rmHistory:  (itemCode) => api.get(`/stock/rm/${encodeURIComponent(itemCode)}/history`),
}

export const ledgerApi = {
  all:        (params)          => api.get('/ledger', { params }),
  item:       (itemCode, params) => api.get(`/ledger/item/${itemCode}`, { params }),
  entryDetail:(id)              => api.get(`/ledger/${id}`),
  meta:       ()                => api.get('/ledger/meta/transaction-types'),
}

export const importApi = {
  preview: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/import/preview', form, { timeout: 60000 })
  },
  execute: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/import/execute', form, { timeout: 300000 })
  },
}

export const grnApi = {
  list:   ()                     => api.get('/grn'),
  detail: (gateInwardId)         => api.get('/grn/detail', { params: { gateInwardId } }),
}

export const gateApi = {

  // Inward
  createInward:         (data)     => api.post('/gate/inward', data),
  // Store-created backing entry for a manual Print Master submission (no
  // existing Gate Inward selected) — company is assigned server-side.
  createManualInward:   (data)     => api.post('/gate/inward/manual', data),
  inwardList:           (params)   => api.get('/gate/inward', { params }),
  updateInward:         (id, data) => api.patch(`/gate/inward/${id}/status`, data),
  editInward:           (id, data) => api.patch(`/gate/inward/${id}`, data),
  requestDeleteInward:  (id)       => api.patch(`/gate/inward/${id}/request-delete`),
  deleteInward:         (id)       => api.delete(`/gate/inward/${id}`),
  // `files` is an array of File objects — an entry can carry several
  // invoice documents, and uploading appends to that set rather than
  // replacing it (see gate/document/gate.controller.js).
  uploadInwardInvoiceDoc: (id, files) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    return api.post(`/gate/inward/${id}/invoice-document`, fd);
  },
  // Same-origin authenticated endpoint — open with openAuthedFile()
  // (utils/authedFile.js), not a plain <a href>, since a raw browser
  // navigation can't carry the Bearer token this route requires. One entry
  // can have several documents, so the specific file's generated name is
  // required (see invoiceDocFileNames on the entry).
  invoiceDocUrl: (id, fileName) => `/api/gate/inward/${encodeURIComponent(id)}/invoice-document/${encodeURIComponent(fileName)}`,


  // Outward
  createOutward:        (data)     => api.post('/gate/outward', data),
  outwardList:          (params)   => api.get('/gate/outward', { params }),
  outwardDetail:        (id)       => api.get(`/gate/outward/${id}`),
  updateOutward:        (id, data) => api.patch(`/gate/outward/${id}/status`, data),
  editOutward:          (id, data) => api.patch(`/gate/outward/${id}`, data),
  requestDeleteOutward: (id)       => api.patch(`/gate/outward/${id}/request-delete`),
  deleteOutward: (id) => api.delete(`/gate/outward/${id}`),
  uploadOutwardInvoiceDoc: (id, files) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    return api.post(`/gate/outward/${id}/invoice-document`, fd);
  },
  // Same-origin authenticated endpoint — open with openAuthedFile()
  // (utils/authedFile.js), not a plain <a href> — mirrors invoiceDocUrl above.
  outwardInvoiceDocUrl: (id, fileName) => `/api/gate/outward/${encodeURIComponent(id)}/invoice-document/${encodeURIComponent(fileName)}`,

}

