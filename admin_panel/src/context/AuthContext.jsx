import { createContext, useCallback, useContext, useMemo, useState } from 'react';
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
      // The admin panel does raw CRUD across every table in the system — the
      // backend only lets this in past every /api/admin/panel/* route via the
      // admin.panel.access permission (see backend/src/modules/admin_panel/
      // router.js), so gate here too: a valid-but-unauthorized login shows
      // one clear error instead of landing in a shell where every request
      // just 403s. Granular from here on — admin.panel.manage (not mere
      // login) is what actually unlocks writes; see isReadOnly/hasPermission.
      if (!res.user?.permissions?.includes('admin.panel.access')) {
        throw new Error('This account cannot access the admin panel. It requires the "admin.panel.access" permission.');
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

  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user]);
  const hasPermission = useCallback((perm) => !!user && permissionSet.has(perm), [user, permissionSet]);
  const hasAnyPermission = useCallback((perms) => perms.some(hasPermission), [hasPermission]);

  // General-purpose "can this account write anything here" flag — the raw
  // CRUD screens (Dashboard/ResourcePage) key off this directly since they
  // have no permission finer than admin.panel.manage. Backup/Data Management
  // key off their own specific admin.backup.manage/admin.data-management.manage
  // instead (see BackupRestorePage.jsx/DataManagementPage.jsx) since those are
  // gated by a different permission on the backend.
  const isReadOnly = !hasPermission('admin.panel.manage');

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isReadOnly, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
