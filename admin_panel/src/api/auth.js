import axios from 'axios';
import { authOrigin, TOKEN_KEY } from './http.js';

// Reuses the same backend accounts/JWT as the main ERP app (backend/access.js,
// POST /api/auth/login) — no separate credential store for the admin panel.
// The `email` param name is only the wire field the backend expects; it
// actually matches against username or phone (email is not a login
// identifier — see backend/src/modules/user/login/login.controller.js).
export async function login(identifier, password) {
  const { data } = await axios.post(`${authOrigin}/auth/login`, { email: identifier, password });
  return data;
}

// "Prove you're still you" re-check before a destructive Data Management
// operation — a plain re-auth call, not a new login (no token is issued).
export async function verifyPassword(password) {
  const token = localStorage.getItem(TOKEN_KEY);
  const { data } = await axios.post(
    `${authOrigin}/auth/verify-password`,
    { password },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}
