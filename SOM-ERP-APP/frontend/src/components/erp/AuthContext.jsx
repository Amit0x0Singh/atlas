// Auth shim — all logic now lives in src/context.jsx
// Every existing import of { AuthProvider, useAuth, RequireAuth } continues to work.
export { AppProvider as AuthProvider, useApp as useAuth } from '../../context/context.jsx'

import { useApp } from '../../context/context.jsx'

export function RequireAuth({ roles = [], children }) {
  const { user } = useApp()

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem', color: '#64748b' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>🔒</div>
        <div>Please log in to access this section.</div>
      </div>
    </div>
  )

  if (roles.length && !roles.includes(user.role)) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem', color: '#dc2626' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>⛔</div>
        <div>Access denied. Required role: {roles.join(' or ')}</div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: '#94a3b8' }}>Your role: {user.role}</div>
      </div>
    </div>
  )

  return children
}
