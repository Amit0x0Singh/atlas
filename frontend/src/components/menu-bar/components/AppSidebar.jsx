import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { APP_NAV } from '../data/navData.js'

// Only Dashboard starts open; everything else is collapsed
const INITIALLY_OPEN = new Set(['DASHBOARD'])

export default function AppSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState(() => new Set(INITIALLY_OPEN))
  const location = useLocation()

  // Auto-expand the group that contains the currently active route
  useEffect(() => {
    APP_NAV.forEach(({ group, items }) => {
      if (items.some(i => i.to === location.pathname)) {
        setOpenGroups(prev => new Set([...prev, group]))
      }
    })
  }, [location.pathname])

  const toggleGroup = (group) =>
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })

  return (
    <aside
      style={{
        width: sidebarOpen ? '220px' : '60px',
        minWidth: sidebarOpen ? '220px' : '60px',
        background: 'linear-gradient(160deg, #081508 0%, #0d1f0d 60%, #0a1a10 100%)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        boxShadow: '2px 0 16px rgba(0,0,0,0.35)',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          borderBottom: '1px solid #1a3320',
          padding: sidebarOpen ? '12px 14px 10px' : '12px 0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          gap: '8px',
          minHeight: '62px',
          flexShrink: 0,
        }}
      >
        {sidebarOpen ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '4px 7px',
                  flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              >
                <img src="/logo.png" alt="SOM" style={{ height: '26px', width: 'auto', display: 'block' }} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#e8f5e8', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  SOM ERP
                </div>
                <div style={{ color: '#4ade80', fontSize: '8px', letterSpacing: '0.14em', whiteSpace: 'nowrap', opacity: 0.8 }}>
                  MANUFACTURING
                </div>
              </div>
            </div>

            {/* Collapse button */}
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              style={{
                background: '#1a3320',
                border: '1px solid #2a5030',
                borderRadius: '6px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4ade80',
                fontSize: '11px',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#22452a'}
              onMouseLeave={e => e.currentTarget.style.background = '#1a3320'}
            >
              ‹
            </button>
          </>
        ) : (
          /* Expand button when collapsed */
          <button
            onClick={() => setSidebarOpen(true)}
            title="Expand sidebar"
            style={{
              background: '#1a3320',
              border: '1px solid #2a5030',
              borderRadius: '6px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#4ade80',
              fontSize: '14px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#22452a'}
            onMouseLeave={e => e.currentTarget.style.background = '#1a3320'}
          >
            ›
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {APP_NAV.map(({ group, items }) => {
          const isOpen = openGroups.has(group)
          const hasActive = items.some(i => i.to === location.pathname)
          const firstIcon = items.find(i => !i.soon)?.icon ?? items[0]?.icon

          return (
            <div key={group} style={{ marginBottom: '2px' }}>

              {/* ── Group header ── */}
              <button
                onClick={() => {
                  if (!sidebarOpen) setSidebarOpen(true)
                  toggleGroup(group)
                }}
                title={!sidebarOpen ? group : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: hasActive && !sidebarOpen ? 'rgba(74,222,128,0.08)' : 'none',
                  border: 'none',
                  borderLeft: hasActive && !sidebarOpen ? '3px solid #4ade80' : '3px solid transparent',
                  cursor: 'pointer',
                  padding: sidebarOpen ? '7px 14px 6px' : '9px 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!hasActive || sidebarOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (!hasActive || sidebarOpen) e.currentTarget.style.background = 'none' }}
              >
                {sidebarOpen ? (
                  <>
                    <span
                      style={{
                        color: hasActive ? '#86d98a' : '#6aaa72',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.13em',
                        flex: 1,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group}
                    </span>
                    <span
                      style={{
                        color: '#5a9065',
                        fontSize: '11px',
                        display: 'inline-block',
                        transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease',
                        lineHeight: 1,
                        marginRight: '2px',
                      }}
                    >
                      ▾
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: '15px',
                      color: hasActive ? '#4ade80' : '#3d6645',
                      transition: 'color 0.15s',
                    }}
                  >
                    {firstIcon}
                  </span>
                )}
              </button>

              {/* ── Items (accordion) ── */}
              <div
                style={{
                  maxHeight: sidebarOpen && isOpen ? '600px' : '0px',
                  overflow: 'hidden',
                  transition: 'max-height 0.25s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {items.map(({ to, label, icon, soon }) =>
                  soon ? (
                    <div
                      key={to}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '6px 14px 6px 24px',
                        fontSize: '12px',
                        color: '#1f4028',
                        cursor: 'default',
                        borderLeft: '3px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: '11px', minWidth: '14px', textAlign: 'center', opacity: 0.4 }}>{icon}</span>
                      <span style={{ opacity: 0.4, flex: 1 }}>{label}</span>
                      <span
                        style={{
                          fontSize: '8px',
                          background: '#1a3a20',
                          color: '#5a9a65',
                          borderRadius: '3px',
                          padding: '1px 5px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          flexShrink: 0,
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
                        gap: '9px',
                        padding: '6px 14px 6px 24px',
                        fontSize: '12.5px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#f0fdf4' : '#a8c8ac',
                        background: isActive
                          ? 'linear-gradient(90deg, rgba(74,222,128,0.12) 0%, rgba(74,222,128,0.04) 100%)'
                          : 'transparent',
                        borderLeft: isActive ? '3px solid #4ade80' : '3px solid transparent',
                        textDecoration: 'none',
                        transition: 'all 0.12s',
                        letterSpacing: '0.01em',
                      })}
                      onMouseEnter={e => { if (!e.currentTarget.getAttribute('data-active')) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (!e.currentTarget.getAttribute('data-active')) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ fontSize: '12px', minWidth: '14px', textAlign: 'center', opacity: 0.75 }}>{icon}</span>
                      <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {label}
                      </span>
                    </NavLink>
                  )
                )}
              </div>

              {/* Divider after each group */}
              <div style={{ height: '1px', background: '#121f12', margin: '2px 0' }} />
            </div>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: '1px solid #1a3320',
          padding: sidebarOpen ? '8px 14px' : '8px 0',
          color: '#5a8a60',
          fontSize: '9px',
          letterSpacing: '0.04em',
          flexShrink: 0,
          textAlign: sidebarOpen ? 'left' : 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {sidebarOpen ? 'v2.5 · SOM Phytopharma' : 'v2.5'}
      </div>
    </aside>
  )
}
