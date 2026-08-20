import { api } from '../context/context.jsx'


export const productApi = {
  list:   (params)     => api.get('/products', { params }),
  // Autosuggest lookup (Sales Order, Production Indent, Recipe BOM editor) —
  // same data/shape as list(), just authenticate-only instead of gated by
  // masters.product.view, since these callers are filling out a form they
  // already have permission for, not browsing Product Master.
  search: (params)     => api.get('/products/search', { params }),
  meta:   ()           => api.get('/products/meta/plants'),
  get:    (code)       => api.get(`/products/${encodeURIComponent(code)}`),
  create: (data)       => api.post('/products', data),
  update: (code, data) => api.put(`/products/${encodeURIComponent(code)}`, data),
  delete: (code)       => api.delete(`/products/${encodeURIComponent(code)}`),
}

export const equipmentApi = {
  list:   (params)     => api.get('/equipment', { params }),
  // Autosuggest lookup (Production Indent) — see productApi.search note.
  search: (params)     => api.get('/equipment/search', { params }),
  meta:   ()           => api.get('/equipment/meta/filters'),
  create: (data)       => api.post('/equipment', data),
  update: (id, data)   => api.put(`/equipment/${id}`, data),
  delete: (id)         => api.delete(`/equipment/${id}`),
}

export const recipeApi = {
  list:           (params)   => api.get('/recipe', { params }),
  products:       ()         => api.get('/recipe/products'),
  // Autosuggest lookup (Production Planning's Issue BOM form) — see
  // productApi.search note.
  productsSearch: ()         => api.get('/recipe/products/search'),
  bulkSave:       (rows)     => api.post('/recipe/bulk-save', { rows }),
  deleteRow:      (id)       => api.delete(`/recipe/${id}`),
  deleteProduct:  (code)     => api.delete(`/recipe/product/${code}`),
  checkRmMapping: ()         => api.get('/recipe/check-rm-mapping'),
  fixRmMapping:   (mappings) => api.post('/recipe/fix-rm-mapping', { mappings }),
}


export const erpSuppliersApi = {
  list:   (params)     => api.get('/masters/suppliers', { params }),
  // Autosuggest lookup (Gate Inward's Supplier Name field) — see
  // productApi.search note.
  search: (params)     => api.get('/masters/suppliers/search', { params }),
  create: (data)       => api.post('/masters/suppliers', data),
  update: (id, data)   => api.put(`/masters/suppliers/${id}`, data),
}

export const erpStrainsApi = {
  list:   ()     => api.get('/masters/strains'),
  create: (data) => api.post('/masters/strains', data),
}
