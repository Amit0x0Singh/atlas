import { createContext, useCallback, useContext, useState } from 'react';
import { login as loginRequest } from '../api/auth.js';
import { TOKEN_KEY, USER_KEY } from '../api/http.js';

const AuthContext = createContext(null);

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await loginRequest(email, password);
      // The admin panel does raw CRUD across every table in the system —
      // only super-admin ('admin' operation) accounts get in, same boundary
      // the backend enforces on every /api/admin/* route. Rejecting here too
      // means a valid-but-unauthorized login shows one clear error instead of
      // landing in a shell where every subsequent request just 401s.
      if (res.user?.operation !== 'admin') {
        throw new Error('This account cannot access the admin panel. A super-admin account is required.');
      }
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const isReadOnly = user?.role !== 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isReadOnly }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
