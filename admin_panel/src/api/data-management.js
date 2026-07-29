import { http } from './http.js';

// Mirrors api/backup.js's convention — data management isn't a resources.js
// CRUD entry, so these call the shared `http` axios instance directly.

export async function previewImpact(payload) {
  const { data } = await http.post('/data-management/preview', payload);
  return data.data;
}

export async function createDelete(payload) {
  const { data } = await http.post('/data-management', payload);
  return data.data;
}

export async function getDeleteStatus(id) {
  const { data } = await http.get(`/data-management/${id}/status`);
  return data.data;
}

export async function listDeletes(params = {}) {
  const { data } = await http.get('/data-management', { params });
  return data;
}

export async function getDeleteDetails(id) {
  const { data } = await http.get(`/data-management/${id}`);
  return data.data;
}

export async function deleteDeleteJob(id) {
  const { data } = await http.delete(`/data-management/${id}`);
  return data;
}
