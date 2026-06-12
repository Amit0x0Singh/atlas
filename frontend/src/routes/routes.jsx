import { Routes, Route, Navigate } from "react-router-dom";

// ── Masters ───────────────────────────────────────────────────────────────────
import RmMaster from "../pages/masters/rm/page/RmMaster.jsx";
import ProductMaster from "../pages/masters/product/page/ProductMaster.jsx";
import EquipmentMaster from "../pages/masters/equipment/page/EquipmentMaster.jsx";
import LocationMaster from "../pages/masters/location/page/LocationMaster.jsx";
import MicrobesMaster from "../pages/masters/microbes/page/MicrobesMaster.jsx";
import RecipeDB from "../pages/masters/recipe/page/RecipeDB.jsx";

// ── Inventory ─────────────────────────────────────────────────────────────────
import Stock from "../pages/inventory/store/stock/page/Stock.jsx";
import Inward from "../pages/inventory/store/inward/page/Inward.jsx";
import Outward from "../pages/inventory/store/outward/page/Outward.jsx";
import GRN from "../pages/inventory/store/grn/page/GRN.jsx";
import Ledger from "../pages/inventory/store/ledger/page/Ledger.jsx";
import Import from "../pages/inventory/import/page/Import.jsx";
import PrintMaster from "../pages/inventory/print-master/page/PrintMaster.jsx";

// ── Production ────────────────────────────────────────────────────────────────
import Indent from "../pages/production/indent/page/Indent.jsx";
import SFG from "../pages/production/sfg/page/SFG.jsx";
import Tracker from "../pages/production/tracker/page/Tracker.jsx";
import Production from "../pages/production/batch/page/Production.jsx";

// ── Microbial ─────────────────────────────────────────────────────────────────
import MicrobialInward from "../pages/microbial/inward/page/MicrobialInward.jsx";
import MicrobialSFG from "../pages/microbial/sfg/page/MicrobialSFG.jsx";

// ── HR ────────────────────────────────────────────────────────────────────────
import EmployeeMaster from "../pages/hr/employee/page/EmployeeMaster.jsx";

// ── Sales & Planning ──────────────────────────────────────────────────────────
import PlanningPage from "../pages/planning/page/Planning.jsx";
import SalesOrder from "../pages/sales/sales-order/page/sales-order.jsx";

// ── ERP module pages ──────────────────────────────────────────────────────────
import GateEntry from "../pages/erp/GateEntry.jsx";
import InventoryManagement from "../pages/erp/InventoryManagement.jsx";
import BomIssuance from "../pages/erp/BomIssuance.jsx";
import PlanningEngine from "../pages/erp/PlanningEngine.jsx";
import SalesOrders from "../pages/erp/SalesOrders.jsx";
import MicrobialManagement from "../pages/erp/MicrobialManagement.jsx";

// ── Layout ────────────────────────────────────────────────────────────────────
import AppSidebar from "../components/menu-bar/components/AppSidebar.jsx";

// ── Placeholder ───────────────────────────────────────────────────────────────
function ComingSoon({ title, icon }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "60vh",
        gap: "16px",
        color: "#94a3b8",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <div style={{ fontSize: "52px", opacity: 0.4 }}>{icon || "🔧"}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#64748b" }}>
        {title}
      </div>
      <div
        style={{
          background: "#f1f5f9",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "8px 20px",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "#94a3b8",
        }}
      >
        COMING SOON
      </div>
    </div>
  );
}

// ── Unified App Layout ────────────────────────────────────────────────────────
function AppLayout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <AppSidebar />
      <main style={{ flex: 1, overflowY: "auto", background: "#f1f5f9" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/stock" replace />} />

          {/* Stock & Dashboard */}
          <Route path="/stock" element={<Stock />} />

          {/* Master Data */}
          <Route path="/rm-master" element={<RmMaster />} />
          <Route path="/product-master" element={<ProductMaster />} />
          <Route path="/equipment-master" element={<EquipmentMaster />} />
          <Route path="/print-master" element={<PrintMaster />} />
          <Route path="/microbes-master" element={<MicrobesMaster />} />
          <Route path="/employee-master" element={<EmployeeMaster />} />
          <Route path="/recipe" element={<RecipeDB />} />
          <Route path="/location-master" element={<LocationMaster />} />

          {/* Inventory / Materials */}
          <Route path="/inward" element={<Inward />} />
          <Route path="/outward" element={<Outward />} />
          <Route path="/microbial-inward" element={<MicrobialInward />} />
          <Route path="/grn" element={<GRN />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/indent" element={<Indent />} />

          {/* Sales */}
          <Route path="/sales-orders" element={<SalesOrder />} />

          {/* Production */}
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/production" element={<Production />} />
          <Route path="/sfg" element={<SFG />} />
          <Route path="/sfg-store" element={<MicrobialSFG />} />

          {/* Reports */}
          <Route path="/import" element={<Import />} />

          {/* Quality Control — coming soon */}
          <Route
            path="/qc-samples"
            element={<ComingSoon title="QC Samples" icon="🧫" />}
          />
          <Route
            path="/qc-results"
            element={<ComingSoon title="Test Results" icon="🔬" />}
          />
          <Route
            path="/qc-reports"
            element={<ComingSoon title="QC Reports" icon="📊" />}
          />

          {/* ERP — Gate & Supply Chain */}
          <Route path="/erp" element={<Navigate to="/erp/gate" replace />} />
          <Route path="/erp/gate" element={<GateEntry />} />
          <Route path="/erp/inventory" element={<InventoryManagement />} />
          <Route path="/erp/microbial" element={<MicrobialManagement />} />

          {/* ERP — Production */}
          <Route path="/erp/bom" element={<BomIssuance />} />
          <Route path="/erp/planning" element={<PlanningEngine />} />

          {/* ERP — Sales */}
          <Route path="/erp/sales" element={<SalesOrders />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/stock" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}
