import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

// ── Masters ───────────────────────────────────────────────────────────────────
import RmMaster        from '../pages/masters/rm/page/RmMaster.jsx'
import ProductMaster   from '../pages/masters/product/page/ProductMaster.jsx'
import EquipmentMaster from '../pages/masters/equipment/page/EquipmentMaster.jsx'
import LocationMaster  from '../pages/masters/location/page/LocationMaster.jsx'
import MicrobesMaster  from '../pages/masters/microbes/page/MicrobesMaster.jsx'
import RecipeDB        from '../pages/masters/recipe/page/RecipeDB.jsx'

// ── Inventory ─────────────────────────────────────────────────────────────────
import Stock       from '../pages/inventory/store/stock/page/Stock.jsx'
import Inward      from '../pages/inventory/store/inward/page/Inward.jsx'
import Outward     from '../pages/inventory/store/outward/page/Outward.jsx'
import GRN         from '../pages/inventory/store/grn/page/GRN.jsx'
import Ledger      from '../pages/inventory/store/ledger/page/Ledger.jsx'
import Import      from '../pages/inventory/import/page/Import.jsx'
import PrintMaster from '../pages/inventory/print-master/page/PrintMaster.jsx'

// ── Production ────────────────────────────────────────────────────────────────
import Indent     from '../pages/production/indent/page/Indent.jsx'
import SFG        from '../pages/production/sfg/page/SFG.jsx'
import Tracker    from '../pages/production/tracker/page/Tracker.jsx'
import Production from '../pages/production/batch/page/Production.jsx'

// ── Microbial ─────────────────────────────────────────────────────────────────
import MicrobialInward from '../pages/microbial/inward/page/MicrobialInward.jsx'
import MicrobialSFG    from '../pages/microbial/sfg/page/MicrobialSFG.jsx'

// ── HR ────────────────────────────────────────────────────────────────────────
import EmployeeMaster from '../pages/hr/employee/page/EmployeeMaster.jsx'

// ── Sales & Planning ──────────────────────────────────────────────────────────
import SalesOrdersPage from '../pages/SalesOrders.jsx'
import PlanningPage    from '../pages/planning/page/Planning.jsx'
import SalesOrder      from '../pages/sales/sales-order/page/sales-order.jsx'

// ── ERP module pages ──────────────────────────────────────────────────────────
import Login               from '../pages/erp/Login.jsx'
import GateEntry           from '../pages/erp/GateEntry.jsx'
import InventoryManagement from '../pages/erp/InventoryManagement.jsx'
import BomIssuance         from '../pages/erp/BomIssuance.jsx'
import PlanningEngine      from '../pages/erp/PlanningEngine.jsx'
import SalesOrders         from '../pages/erp/SalesOrders.jsx'
import MicrobialManagement from '../pages/erp/MicrobialManagement.jsx'

// ── Auth & Notifications ──────────────────────────────────────────────────────
import { AuthProvider, useAuth } from '../components/erp/AuthContext.jsx'
import NotificationBell          from '../components/erp/NotificationBell.jsx'

// ── Menu-bar components ───────────────────────────────────────────────────────
import LegacySidebar from '../components/menu-bar/components/LegacySidebar.jsx'
import ErpSidebar    from '../components/menu-bar/components/ErpSidebar.jsx'
import ErpPageTitle  from '../components/menu-bar/components/ErpPageTitle.jsx'

// ── Placeholder ───────────────────────────────────────────────────────────────
function ComingSoon({ title, icon }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '60vh',
        gap: '16px',
        color: '#94a3b8',
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <div style={{ fontSize: '52px', opacity: 0.4 }}>{icon || '🔧'}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#64748b' }}>{title}</div>
      <div
        style={{
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 20px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: '#94a3b8',
        }}
      >
        COMING SOON
      </div>
      <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '320px', textAlign: 'center', marginTop: '4px' }}>
        This module is under development and will be available soon.
      </p>
    </div>
  )
}

// ── Legacy Layout ─────────────────────────────────────────────────────────────
function LegacyLayout() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <LegacySidebar />
      <main style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>
        <Routes>
          <Route path="/"                 element={<Navigate to="/stock" replace />} />
          <Route path="/stock"            element={<Stock />} />
          <Route path="/rm-master"        element={<RmMaster />} />
          <Route path="/product-master"   element={<ProductMaster />} />
          <Route path="/equipment-master" element={<EquipmentMaster />} />
          <Route path="/print-master"     element={<PrintMaster />} />
          <Route path="/inward"           element={<Inward />} />
          <Route path="/outward"          element={<Outward />} />
          <Route path="/recipe"           element={<RecipeDB />} />
          <Route path="/indent"           element={<Indent />} />
          <Route path="/sfg"              element={<SFG />} />
          <Route path="/sfg-store"        element={<MicrobialSFG />} />
          <Route path="/microbes-master"  element={<MicrobesMaster />} />
          <Route path="/microbial-inward" element={<MicrobialInward />} />
          <Route path="/ledger"           element={<Ledger />} />
          <Route path="/import"           element={<Import />} />
          <Route path="/tracker"          element={<Tracker />} />
          <Route path="/grn"              element={<GRN />} />
          <Route path="/production"       element={<Production />} />
          <Route path="/location-master"  element={<LocationMaster />} />
          <Route path="/employee-master"  element={<EmployeeMaster />} />

          {/* <Route path="/sales-orders" element={<SalesOrdersPage />} /> */}
          <Route path="/sales-orders"     element={<SalesOrder />} />

          <Route path="/planning"         element={<PlanningPage />} />

          {/* Quality Control — placeholders until pages are built */}
          <Route path="/qc-samples" element={<ComingSoon title="QC Samples"  icon="🧫" />} />
          <Route path="/qc-results" element={<ComingSoon title="Test Results" icon="🔬" />} />
          <Route path="/qc-reports" element={<ComingSoon title="QC Reports"   icon="📊" />} />
        </Routes>
      </main>
    </div>
  )
}

// ── ERP Layout ────────────────────────────────────────────────────────────────
function ErpLayout() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/erp/login" state={{ from: location }} replace />

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <ErpSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            height: '48px',
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <ErpPageTitle />
          <NotificationBell />
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>
          <Routes>
            <Route index           element={<Navigate to="gate" replace />} />
            <Route path="gate"     element={<GateEntry />} />
            <Route path="inventory"element={<InventoryManagement />} />
            <Route path="bom"      element={<BomIssuance />} />
            <Route path="planning" element={<PlanningEngine />} />
            <Route path="sales"    element={<SalesOrders />} />
            <Route path="microbial"element={<MicrobialManagement />} />
            <Route path="*"        element={<Navigate to="gate" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

// ── ERP Login Page ────────────────────────────────────────────────────────────
function ErpLoginPage() {
  const { user } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/erp/gate'

  if (user) return <Navigate to={from} replace />

  return <Login onLogin={() => window.location.replace(from)} />
}

// ── Root Routes (consumed by App.jsx inside <BrowserRouter>) ─────────────────
export default function AppRoutes() {
  return (
    <Routes>
      {/* ERP v2 — auth-protected, own layout */}
      <Route path="/erp/login" element={<ErpLoginPage />} />
      <Route path="/erp/*"     element={<ErpLayout />} />

      {/* Legacy app — sidebar + all routes */}
      <Route path="/*" element={<LegacyLayout />} />
    </Routes>
  )
}
