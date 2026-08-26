import './Stock.css'
import { useState, useEffect } from "react";
import { useDashboardSummary, usePrefetchDashboardLinks } from "../../../../../hooks/inventory/useDashboardSummary.js";
import { BackButton, IconButton, PageHeader } from "../../../../../components/ui";
import { PERIODS } from "../components/utils.js";
import RawMaterialsSection from "../components/raw-materials-section/RawMaterialsSection.jsx";
import GateSection from "../components/gate-section/GateSection.jsx";
import StoreSection from "../components/store-section/StoreSection.jsx";
import ProductionSection from "../components/production-section/ProductionSection.jsx";
import SalesSection from "../components/sales-section/SalesSection.jsx";
import { RefreshCw, LayoutDashboard } from "lucide-react";

export default function Stock() {
  const [period, setPeriod] = useState("today");
  // 15s staleTime (CACHE.DASHBOARD) — switching periods and back within that
  // window reuses the cached value instantly instead of re-hitting the
  // backend; past it, refetch happens quietly in the background (isFetching)
  // rather than blanking the page back to a loading skeleton.
  const { data, isLoading: loading, error: queryError, dataUpdatedAt, refetch } = useDashboardSummary(period);
  const { prefetchInventory, prefetchSalesOrders } = usePrefetchDashboardLinks();
  const error = queryError?.message || "";
  const ts = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // From the dashboard, RM Material / Sales Orders are the pages an operator
  // opens next most often — warm both caches as soon as this page mounts so
  // that navigating to either feels instant instead of showing a fresh spinner.
  useEffect(() => {
    prefetchInventory();
    prefetchSalesOrders();
  }, [prefetchInventory, prefetchSalesOrders]);

  const d = data || {};
  const rm = d.rawMaterials || {};
  const gate = d.gate || {};
  const st = d.store || {};
  const prod = d.production || {};
  const so = d.salesOrders || {};
  const dis = d.dispatch || {};

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        icon={LayoutDashboard}
        title="ERP Dashboard"
        description={<>
          Atlas · operational overview
          {ts && <> · refreshed {ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</>}
        </>}
        actions={<>
          <IconButton icon={RefreshCw} onClick={refetch} tooltip="Refresh" variant="outline-gray" size="sm" />
          <BackButton />
        </>}
      />

      <div className="px-4 md:px-6 py-7">
        {/* Period selector */}
        <div className="flex gap-1 mb-8 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                period === p.key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <RawMaterialsSection rm={rm} loading={loading} />
          <GateSection gate={gate} loading={loading} label={periodLabel} />
          <StoreSection st={st} loading={loading} label={periodLabel} />
          <ProductionSection
            prod={prod}
            loading={loading}
            label={periodLabel}
          />
          <SalesSection
            so={so}
            dis={dis}
            loading={loading}
            label={periodLabel}
          />
        </div>

        <p className="text-[11px] text-gray-400 mt-8 pl-0.5">
          ※ Raw Materials count shows current stock state. All other metrics are
          filtered by <strong>{periodLabel}</strong>.
        </p>
      </div>
    </div>
  );
}
