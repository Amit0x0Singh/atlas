import axios from 'axios';
import { authOrigin } from './http.js';

// Reuses the same backend accounts/JWT as the main ERP app (backend/access.js,
// POST /api/auth/login) — no separate credential store for the admin panel.
export async function login(email, password) {
  const { data } = await axios.post(`${authOrigin}/auth/login`, { email, password });
  return data;
}
