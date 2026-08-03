import { http } from './http.js';

// Mirrors api/data-management.js's convention — not a resources.js CRUD
// entry, so these call the shared `http` axios instance directly.

export async function previewTransform(payload) {
  const { data } = await http.post('/bulk-transform/preview', payload);
  return data.data;
}

export async function createTransform(payload) {
  const { data } = await http.post('/bulk-transform', payload);
  return data.data;
}

export async function getTransformStatus(id) {
  const { data } = await http.get(`/bulk-transform/${id}/status`);
  return data.data;
}
