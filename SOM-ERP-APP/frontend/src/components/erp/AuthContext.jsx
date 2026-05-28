/**
 * ERP Auth Context — JWT-based auth state for ERP modules
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../../api/erp-client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const res = await authApi.login({ username, password })
      localStorage.setItem('erp_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      setUser(res.user)
      return res.user
    } finally {
      setLoading(false)
    }
  }, [])

  const pinLogin = useCallback(async (username, pin) => {
    setLoading(true)
    try {
      const res = await authApi.pinLogin({ username, pin })
      localStorage.setItem('erp_token', res.token)
      localStorage.setItem('erp_user', JSON.stringify(res.user))
      setUser(res.user)
      return res.user
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setUser(null)
  }, [])

  // Listen for token-expired events from API interceptor
  useEffect(() => {
    const handler = () => { setUser(null) }
    window.addEventListener('erp_logout', handler)
    return () => window.removeEventListener('erp_logout', handler)
  }, [])

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role)
  }, [user])

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole])
  const canApprove = useCallback(() => hasRole('store_manager', 'planning_manager', 'admin'), [hasRole])
  const canPublish = useCallback(() => hasRole('planning_manager', 'admin'), [hasRole])

  return (
    <AuthContext.Provider value={{ user, loading, login, pinLogin, logout, hasRole, isAdmin, canApprove, canPublish }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function RequireAuth({ roles = [], children }) {
  const { user } = useContext(AuthContext) || {}
  if (!user) return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      <div className="text-center">
        <div className="text-3xl mb-2">🔒</div>
        <div>Please log in to access this section.</div>
      </div>
    </div>
  )
  if (roles.length && !roles.includes(user.role)) return (
    <div className="flex items-center justify-center h-64 text-red-500">
      <div className="text-center">
        <div className="text-3xl mb-2">⛔</div>
        <div>Access denied. Required role: {roles.join(' or ')}</div>
        <div className="text-sm mt-1 text-slate-400">Your role: {user.role}</div>
      </div>
    </div>
  )
  return children
}
