import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

// The backend mounts login at /api/auth/login, a sibling of this instance's
// /api/admin baseURL — outside what the `http` axios instance (scoped to
// baseURL) can reach, so it needs its own origin derived from the same base.
export const authOrigin = baseURL.replace(/\/admin\/?$/, '');

export const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export const TOKEN_KEY = 'admin_panel_token';
export const USER_KEY = 'admin_panel_user';

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 here means the token is missing/expired/invalid — clear it and drop
// back to the login screen. Reloading (rather than routing) is deliberate:
// it guarantees every in-memory auth/resource state resets cleanly instead
// of trying to unwind whatever request was in flight when this fired.
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// Returns the endpoint path for a resource, relative to `http`'s own
// baseURL — every caller passes this straight to an `http.*` method, and
// that axios instance already prepends baseURL itself. Joining baseURL in
// here too used to double it up (http://host/api/admin/api/admin/...)
// whenever baseURL wasn't an absolute http(s) URL axios could recognize and
// leave alone. Uses VITE env override first, then defaultEndpoint, then
// resource.path.
export function getResourceUrl(resource) {
  const override = resource.envKey ? import.meta.env[resource.envKey] : undefined;
  return override || resource.defaultEndpoint || resource.path;
}

export function getRecordId(record, resource) {
  if (!record) return '';
  if (Array.isArray(resource.idField)) {
    return resource.idField.map((f) => encodeURIComponent(record[f])).join('/');
  }
  return encodeURIComponent(record[resource.idField]);
}

// Returns { data: [], total, page, limit } so callers can display accurate totals.
export async function listRecords(resource, params = {}) {
  const { data } = await http.get(getResourceUrl(resource), { params });
  if (Array.isArray(data)) return { data, total: data.length };
  return {
    data:  data?.data    ?? data?.records ?? [],
    total: data?.total   ?? (data?.data?.length ?? 0),
    page:  data?.page,
    limit: data?.limit,
  };
}

export async function createRecord(resource, payload) {
  const { data } = await http.post(getResourceUrl(resource), payload);
  return data;
}

export async function updateRecord(resource, record, payload) {
  const url = `${getResourceUrl(resource)}/${getRecordId(record, resource)}`;
  const { data } = await http.put(url, payload);
  return data;
}

export async function deleteRecord(resource, record) {
  const url = `${getResourceUrl(resource)}/${getRecordId(record, resource)}`;
  const { data } = await http.delete(url);
  return data;
}

export async function deleteAllRecords(resource) {
  const { data } = await http.delete(getResourceUrl(resource));
  return data;
}

// GET /admin/stats — row counts for every table, used by the Dashboard.
export async function getStats() {
  const { data } = await http.get('/stats');
  return data?.data ?? {};
}
