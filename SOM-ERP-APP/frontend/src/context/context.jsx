import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE || '/api'

// ── Legacy API instance (no auth) ─────────────────────────────────────────────
export const api = axios.create({ baseURL: BASE, timeout: 30000 })

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

// ── ERP API instance (JWT auth) ───────────────────────────────────────────────
export const erpApi = axios.create({ baseURL: BASE, timeout: 45000 })

erpApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

erpApi.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      window.dispatchEvent(new Event('erp_logout'))
    }
    const message = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

// ── App Context ───────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_user')) || null }
    catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const res = await erpApi.post('/auth/login', { username, password })
      localStorage.setItem('erp_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      setUser(res.user)
      return res.user
    } finally { setLoading(false) }
  }, [])

  const pinLogin = useCallback(async (username, pin) => {
    setLoading(true)
    try {
      const res = await erpApi.post('/auth/pin-login', { username, pin })
      localStorage.setItem('erp_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      setUser(res.user)
      return res.user
    } finally { setLoading(false) }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setUser(null)
  }, [])

  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('erp_logout', handler)
    return () => window.removeEventListener('erp_logout', handler)
  }, [])

  const hasRole = useCallback((...roles) => user && roles.includes(user.role), [user])
  const isAdmin = useCallback(() => hasRole('admin'), [hasRole])
  const canApprove = useCallback(() => hasRole('store_manager', 'planning_manager', 'admin'), [hasRole])
  const canPublish = useCallback(() => hasRole('planning_manager', 'admin'), [hasRole])

  return (
    <AppContext.Provider value={{ user, loading, login, pinLogin, logout, hasRole, isAdmin, canApprove, canPublish }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
