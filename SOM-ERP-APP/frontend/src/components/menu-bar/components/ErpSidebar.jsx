import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../erp/AuthContext.jsx'
import { ERP_NAV, ROLE_BADGE } from '../data/navData.js'

export default function ErpSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const rb = ROLE_BADGE[user?.role] || { bg: '#f1f5f9', color: '#475569' }

  return (
    <aside
      style={{
        width: '224px',
        background: '#0d1f0d',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Logo */}
      <div style={{ borderBottom: '1px solid #1a3320', padding: '14px 16px 12px' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'inline-block',
            marginBottom: '6px',
          }}
        >
          <img
            src="/logo.png"
            alt="SOM Phytopharma"
            style={{ height: '32px', width: 'auto', display: 'block' }}
          />
        </div>
        <div
          style={{
            color: '#4ade80',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            marginTop: '2px',
          }}
        >
          ERP v2 · MANUFACTURING
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {ERP_NAV.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: '4px' }}>
            <div
              style={{
                color: '#2d5c38',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                padding: '10px 20px 4px',
              }}
            >
              {group}
            </div>
            {items.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#f0fdf4' : '#86a98e',
                  background: isActive ? '#1a4a22' : 'transparent',
                  borderLeft: isActive ? '3px solid #4ade80' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                })}
              >
                <span style={{ fontSize: '13px', minWidth: '16px', textAlign: 'center' }}>
                  {icon}
                </span>
                {label}
              </NavLink>
            ))}
          </div>
        ))}

        <div style={{ margin: '12px 12px 4px', borderTop: '1px solid #1a3320' }} />

        <NavLink
          to="/stock"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            fontSize: '12px',
            color: '#4d7a55',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '11px' }}>◀</span> Legacy App
        </NavLink>
      </nav>

      {/* User card */}
      <div style={{ borderTop: '1px solid #1a3320', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              flexShrink: 0,
              background: '#1a4a22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#86efac',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            {(user?.full_name || user?.username || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: '#f1f5f9',
                fontSize: '12px',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.full_name || user?.username}
            </div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '1px 6px',
                borderRadius: '10px',
                marginTop: '2px',
                background: rb.bg,
                color: rb.color,
              }}
            >
              {(user?.role || '').replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate('/erp/login') }}
          style={{
            width: '100%',
            padding: '7px',
            background: 'transparent',
            border: '1px solid #1a3320',
            borderRadius: '6px',
            color: '#4d7a55',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) =>
            Object.assign(e.currentTarget.style, { background: '#dc2626', color: '#fff', borderColor: '#dc2626' })
          }
          onMouseLeave={(e) =>
            Object.assign(e.currentTarget.style, { background: 'transparent', color: '#4d7a55', borderColor: '#1a3320' })
          }
        >
          ⏻ SIGN OUT
        </button>
      </div>
    </aside>
  )
}
