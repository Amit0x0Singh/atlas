import './menu-bar.css'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { APP_NAV } from '../data/navData.js'
import SidebarHeader  from '../components/sidebar-header/SidebarHeader.jsx'
import NavGroup       from '../components/nav-group/NavGroup.jsx'
import SidebarFooter  from '../components/sidebar-footer/SidebarFooter.jsx'

const INITIALLY_OPEN = new Set(['DASHBOARD'])

const Sidebar = () => {
   
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGroups, setOpenGroups]   = useState(() => new Set(INITIALLY_OPEN))
  const location = useLocation()

  useEffect(() => {
    APP_NAV.forEach(({ group, items }) => {
      if (items.some(i => i.to === location.pathname))
        setOpenGroups(prev => new Set([...prev, group]))
    })
  }, [location.pathname])

  const toggleGroup = (group) =>
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>
      <SidebarHeader
        sidebarOpen={sidebarOpen}
        onCollapse={() => setSidebarOpen(false)}
        onExpand={() => setSidebarOpen(true)}
      />

      <nav className="sidebar-nav">
        {APP_NAV.map(({ group, items }) => (
          <NavGroup
            key={group}
            group={group}
            items={items}
            isOpen={openGroups.has(group)}
            hasActive={items.some(i => i.to === location.pathname)}
            sidebarOpen={sidebarOpen}
            onToggle={() => {
              if (!sidebarOpen) setSidebarOpen(true)
              toggleGroup(group)
            }}
          />
        ))}
      </nav>

      <SidebarFooter sidebarOpen={sidebarOpen} />
    </aside>
  )
}


export default Sidebar;