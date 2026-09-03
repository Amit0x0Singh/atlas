import './SIdebarFooter.css'
import { NavLink } from 'react-router-dom'
import { UserRound, LogOut } from 'lucide-react'
import { useApp } from '../../../../context/context.jsx'

export default function SidebarFooter({ sidebarOpen }) {
  const { user, logout } = useApp()

  if (!user) return null

  const displayName = (user.fullName || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || user.email

  return (
    <div className={`sf-root ${sidebarOpen ? 'sf-root--open' : 'sf-root--collapsed'}`}>
      {sidebarOpen && (
        <div className="sf-identity">
          <div className="sf-email">{displayName}</div>
          <div className="sf-meta">
            {(user.roles || []).map(role => (
              <span key={role} className="sf-role">{role}</span>
            ))}
            {user.plants?.length > 0 && <span>· {user.plants.join(', ')}</span>}
          </div>
        </div>
      )}

      {/* Profile sits above Log out — both icon buttons */}
      <div className="sf-actions">
        <NavLink to="/profile" className="sf-btn" title="My profile">
          <UserRound size={16} />
          {sidebarOpen && <span>My profile</span>}
        </NavLink>
        <button type="button" onClick={logout} className="sf-btn sf-btn--logout" title="Log out">
          <LogOut size={16} />
          {sidebarOpen && <span>Log out</span>}
        </button>
      </div>
    </div>
  )
}
