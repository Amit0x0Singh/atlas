import { NavLink } from 'react-router-dom'
import { LEGACY_NAV } from '../data/navData.js'

export default function LegacySidebar() {
  return (
    <aside
      style={{
        width: '220px',
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
            color: '#4d7a55',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.08em',
          }}
        >
          ERP — INVENTORY &amp; PRODUCTION
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {LEGACY_NAV.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: '4px' }}>
            <div
              style={{
                color: '#2d5c38',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                padding: '10px 20px 4px',
              }}
            >
              {group}
            </div>
            {items.map(({ to, label, icon, soon }) =>
              soon ? (
                <div
                  key={to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    color: '#2d5c38',
                    cursor: 'default',
                    borderLeft: '3px solid transparent',
                    letterSpacing: '0.01em',
                  }}
                >
                  <span style={{ fontSize: '11px', opacity: 0.5, minWidth: '14px', textAlign: 'center' }}>
                    {icon}
                  </span>
                  <span style={{ opacity: 0.45 }}>{label}</span>
                  <span
                    style={{
                      fontSize: '9px',
                      background: '#1a3320',
                      color: '#4d7a55',
                      borderRadius: '4px',
                      padding: '1px 5px',
                      marginLeft: 'auto',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                    }}
                  >
                    SOON
                  </span>
                </div>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#f0fdf4' : '#86a98e',
                    background: isActive ? '#1a4a22' : 'transparent',
                    borderLeft: isActive ? '3px solid #4ade80' : '3px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    letterSpacing: '0.01em',
                  })}
                >
                  <span style={{ fontSize: '11px', opacity: 0.7, minWidth: '14px', textAlign: 'center' }}>
                    {icon}
                  </span>
                  {label}
                </NavLink>
              )
            )}
          </div>
        ))}
      </nav>

      {/* Switch to ERP v2 */}
      <div style={{ borderTop: '1px solid #1a3320', padding: '10px 12px' }}>
        <NavLink
          to="/erp/gate"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 12px',
            background: '#1a4a22',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#86efac',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <span>⚡</span> Switch to ERP v2
        </NavLink>
      </div>

      {/* Version */}
      <div
        style={{
          borderTop: '1px solid #1a3320',
          padding: '12px 20px',
          color: '#2d5c38',
          fontSize: '10px',
          letterSpacing: '0.04em',
        }}
      >
        v2.5 · SOM Phytopharma (India) Ltd
      </div>
    </aside>
  )
}
