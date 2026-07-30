import { http } from './http.js';

// Dedicated API module — backups aren't a resources.js CRUD entry, so these
// call the shared `http` axios instance directly rather than going through
// getResourceUrl()/listRecords() etc.

export async function listBackups(params = {}) {
  const { data } = await http.get('/backup', { params });
  return data;
}

export async function getBackupDetails(id) {
  const { data } = await http.get(`/backup/${id}`);
  return data.data;
}

export async function getBackupStatus(id) {
  const { data } = await http.get(`/backup/${id}/status`);
  return data.data;
}

export async function getRestoreStatus(id) {
  const { data } = await http.get(`/backup/restore/${id}/status`);
  return data.data;
}

export async function getTablesMetadata() {
  const { data } = await http.get('/backup/tables');
  return data.data.tables;
}

export async function createBackup(payload) {
  const { data } = await http.post('/backup', payload);
  return data.data;
}

export async function deleteBackup(id) {
  const { data } = await http.delete(`/backup/${id}`);
  return data;
}

export async function restoreFromHistory(id) {
  const { data } = await http.post(`/backup/${id}/restore`);
  return data.data;
}

export async function restoreFromUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post('/backup/upload/restore', formData);
  return data.data;
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadBackup(id, fileName) {
  const { data } = await http.get(`/backup/${id}/download`, { responseType: 'blob' });
  triggerBlobDownload(data, fileName || `${id}.json.gz`);
}

// Reporting/analysis export (.xlsx) — a derived view of the backup's data,
// never used for restoring. The original .json.gz stays untouched.
export async function downloadBackupExcel(id, name) {
  const { data } = await http.get(`/backup/${id}/download/excel`, { responseType: 'blob' });
  const safeName = (name || id).replace(/[\\/?*[\]:]/g, '_');
  triggerBlobDownload(data, `${safeName}.xlsx`);
}
