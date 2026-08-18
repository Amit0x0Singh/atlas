import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE || '/api'

// ── Single API instance (attaches token when present) ─────────────────────────
export const api = axios.create({ baseURL: BASE, timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // Field-level validation failures (see middleware/preprocessing/validate.js)
    // come back as { errors: [...] } rather than a single `error` string —
    // join them so callers see exactly which fields failed instead of a
    // generic "Request failed with status code 400".
    const data = err.response?.data
    const message = (Array.isArray(data?.errors) && data.errors.length ? data.errors.join('; ') : null)
      || data?.error || err.message || 'Network error'
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(new Error(message))
  }
)

// ── App Context ────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_user')) || null }
    catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const userRef = useRef(user)
  userRef.current = user

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('erp_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      setUser(res.user)
      return res.user
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    // Best-effort — stateless JWT means there's nothing server-side to
    // invalidate, this call exists purely to record the action. A user
    // must always be able to log out locally even if this fails/is offline.
    api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setUser(null)
  }, [])

  // The client's explicit "check for a permission change" poll — always
  // resolves fresh server-side (see backend /auth/me), so an admin revoking
  // a role/permission is visible on this user's next call without forcing a
  // re-login. Called on mount + on window focus (see effect below).
  const refreshPermissions = useCallback(async () => {
    if (!userRef.current) return
    try {
      const res = await api.get('/auth/me')
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      setUser(res.user)
    } catch {
      // A 401 here is already handled by the response interceptor (forces
      // logout + redirect) — nothing extra to do on failure.
    }
  }, [])

  useEffect(() => {
    refreshPermissions()
    window.addEventListener('focus', refreshPermissions)
    return () => window.removeEventListener('focus', refreshPermissions)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user])

  const hasPermission = useCallback((perm) => permissionSet.has(perm), [permissionSet])
  const hasAnyPermission = useCallback((perms) => perms.some((p) => permissionSet.has(p)), [permissionSet])
  const hasAllPermissions = useCallback((perms) => perms.every((p) => permissionSet.has(p)), [permissionSet])

  return (
    <AppContext.Provider value={{
      user, loading, login, logout, refreshPermissions,
      hasPermission, hasAnyPermission, hasAllPermissions,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
