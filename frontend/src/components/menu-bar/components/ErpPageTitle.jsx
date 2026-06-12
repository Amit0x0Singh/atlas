import { useLocation } from 'react-router-dom'
import { PAGE_NAMES } from '../data/navData.js'

export default function ErpPageTitle() {
  const loc = useLocation()
  const seg = loc.pathname.replace(/\/$/, '').split('/').pop()
  return (
    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
      {PAGE_NAMES[seg] || 'SOM ERP v2'}
    </span>
  )
}
