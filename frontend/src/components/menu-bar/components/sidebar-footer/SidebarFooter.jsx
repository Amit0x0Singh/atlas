import './SIdebarFooter.css'

export default function SidebarFooter({ sidebarOpen }) {
  return (
    <div className={`sf-root ${sidebarOpen ? 'sf-root--open' : 'sf-root--collapsed'}`}>
      {sidebarOpen ? 'v2.5 · SOM Phytopharma' : 'v2.5'}
    </div>
  )
}
