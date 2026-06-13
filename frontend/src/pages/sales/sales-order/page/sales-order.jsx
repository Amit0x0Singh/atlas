import { useState, useEffect, useCallback } from "react";
import {
  salesOrderApi,
  customerProfileApi,
  cpProfileApi,
} from "../../../../api/sales.js";
import { productApi } from "../../../../api/masters.js";
import { STATIC_CUSTOMER_PROFILES } from "../../../../data/customerProfiles";
import {
  STATUS_STYLE,
  STATUS_LABELS,
  BRAND,
} from "../shared/constants.js";
import { fmtDate, etdDays } from "../shared/utils.js";
import CreateSalesOrder from "../component/create-sales-order.jsx";
import DispatchOrder from "../component/dispatch-order.jsx";
import OrderHistory from "../component/order-history.jsx";
import SalesFilterBar from "../component/SalesFilterBar.jsx";

const EMPTY_FILTERS = { search: "", status: "", company: "", from_date: "", to_date: "" };

// ─────────────────────────────────────────────────────────────────────────────
// NewOrderModal — centered overlay with the CreateSalesOrder form inside
// ─────────────────────────────────────────────────────────────────────────────
function NewOrderModal({ editing, products, profiles, onSave, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "min(920px, 95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "20px 28px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
            borderRadius: "16px 16px 0 0",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
              {editing ? `Edit Order — ${editing.soId}` : "New Sales Order"}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
              Fill in the order details below
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              fontSize: "16px",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: "24px 28px 28px" }}>
          <CreateSalesOrder
            initial={editing || undefined}
            products={products}
            profiles={profiles}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SalesOrder — main page
// ─────────────────────────────────────────────────────────────────────────────
const SalesOrder = () => {
  // ── Core data ─────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [profiles, setProfiles] = useState(STATIC_CUSTOMER_PROFILES);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("orders");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [sfgAlert, setSfgAlert] = useState(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ordRes = await salesOrderApi.list({});
      setOrders(ordRes.data);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }

    try {
      const prodRes = await productApi.list({});
      setProducts(prodRes.data || []);
    } catch {
      /* non-critical */
    }

    try {
      const profRes = await customerProfileApi.list();
      if (profRes.data?.length > 0) {
        setProfiles((prev) => {
          const merged = [...prev];
          for (const p of profRes.data) {
            if (!merged.find((x) => x.customerName === p.customerName))
              merged.push(p);
          }
          return merged.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
        });
      }
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handler ──────────────────────────────────────────────────────────
  async function handleSave(form) {
    let sfgResult = null;
    if (editing) {
      await salesOrderApi.update(editing.id, form);
    } else {
      const res = await salesOrderApi.create(form);
      if (res?.sfgAvailability?.length) sfgResult = res.sfgAvailability;
    }
    if (form.customerName?.trim()) {
      try {
        await customerProfileApi.upsert({
          customerName: form.customerName.trim().toUpperCase(),
          company: form.company || "",
          orderType: form.orderType || "DOMESTIC",
        });
      } catch { /* non-critical */ }
    }
    if (form.customerName?.trim() && form.items?.length) {
      try {
        const toSave = form.items.filter((it) => it.customerProductName?.trim());
        if (toSave.length > 0) {
          await cpProfileApi.upsertMany(
            form.customerName.trim(),
            toSave.map((it) => ({
              ...it,
              customerProductName: it.customerProductName,
              productCode: it.inhouseProductCode || null,
              productName: it.customerProductName,
              inhouseName: it.inhouseProductName || null,
              primaryPack: it.unitPackType || null,
              secondaryPack: it.packingType || null,
            })),
          );
        }
      } catch { /* non-critical */ }
    }
    setShowForm(false);
    setEditing(null);
    if (sfgResult) setSfgAlert(sfgResult);
    load();
  }

  async function handleDelete(order) {
    if (!confirm(`Delete order ${order.diNo}?`)) return;
    await salesOrderApi.remove(order.id);
    setDispatchOrder(null);
    load();
  }

  async function handleDispatchSave() {
    setDispatchOrder(null);
    load();
  }

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => setFilters(EMPTY_FILTERS);

  // ── Derived state ─────────────────────────────────────────────────────────

  // History tab — client-side filtered
  const ordersVisible = orders.filter((o) => {
    const q = filters.search.toLowerCase();
    const matchSearch =
      !q ||
      o.customerName?.toLowerCase().includes(q) ||
      o.diNo?.toLowerCase().includes(q);
    const matchStatus =
      !filters.status || o.items.some((it) => it.status === filters.status);
    const matchCompany =
      !filters.company || o.company === filters.company;
    const d = o.orderReceivedDate ? new Date(o.orderReceivedDate) : null;
    const matchFrom = !filters.from_date || (d && d >= new Date(filters.from_date));
    const matchTo   = !filters.to_date   || (d && d <= new Date(filters.to_date + "T23:59:59"));
    return matchSearch && matchStatus && matchCompany && matchFrom && matchTo;
  });

  // Dispatch tab — only IN_INVENTORY orders
  const dispatchVisible = orders.filter((o) =>
    o.items.some((it) => it.status === "IN_INVENTORY"),
  );

  const TABS = [
    { key: "orders",   label: "Sales Orders",  count: orders.length },
    { key: "dispatch", label: "Dispatch",       count: dispatchVisible.length },
    { key: "history",  label: "Order History",  count: ordersVisible.length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          SOM Phytopharma — {orders.length} orders total
        </p>
      </div>

      {err && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          {err}
        </div>
      )}

      {/* SFG availability alert */}
      {sfgAlert && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-green-800 mb-2">
                ✅ SFG Stock Available — Planner Action Required
              </p>
              <div className="space-y-1">
                {sfgAlert.map((s, i) => (
                  <div key={i} className="text-sm text-green-700 flex gap-3">
                    <span className="font-semibold">{s.productCode}</span>
                    <span>{s.productName}</span>
                    <span className="ml-auto text-green-900 font-semibold">
                      {s.sfgQty} {s.uom} in SFG
                      {s.orderedQty && (
                        <span className={s.sfgQty >= s.orderedQty ? " text-green-600" : " text-orange-600"}>
                          {" "}(ordered {s.orderedQty} {s.uom}
                          {s.sfgQty >= s.orderedQty ? " — fully covered ✓" : " — partial"})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-2">
                Inform the planner — these products can be packed directly from SFG stock.
              </p>
            </div>
            <button
              onClick={() => setSfgAlert(null)}
              className="text-green-500 hover:text-green-800 text-lg leading-none mt-0.5"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setShowForm(false);
            }}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Sales Orders ─────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <div>
          {/* "+ New Order" button */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-1.5"
              style={{ background: BRAND }}
            >
              + New Order
            </button>
          </div>

          {/* Order list */}
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-medium">No orders yet</p>
              <p className="text-sm mt-1">Click "+ New Order" to add one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const days = etdDays(order.estimatedDispatchDate);
                const overdue = days !== null && days < 0;
                return (
                  <div
                    key={order.id}
                    className={`bg-white border rounded-xl overflow-hidden ${overdue ? "border-red-300" : "border-gray-200"}`}
                  >
                    <div className="flex items-start justify-between px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900">{order.diNo}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {order.company}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                            {order.orderType}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-gray-700">
                          {order.customerName}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                          <span>{order.items.length} product{order.items.length !== 1 ? "s" : ""}</span>
                          {days !== null && (
                            <span className={overdue ? "text-red-500 font-semibold" : days <= 7 ? "text-orange-500 font-semibold" : ""}>
                              ETD: {fmtDate(order.estimatedDispatchDate)}
                              {overdue ? ` (${Math.abs(days)}d overdue)` : days === 0 ? " (today)" : ` (${days}d)`}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {order.items.map((it) => (
                            <span
                              key={it.id}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[it.status] || "bg-gray-100 text-gray-600"}`}
                            >
                              {it.inhouseProductName} — {STATUS_LABELS[it.status] || it.status}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <button
                          onClick={() => { setEditing(order); setShowForm(true); }}
                          className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Dispatch ─────────────────────────────────────────────── */}
      {activeTab === "dispatch" && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm text-gray-500 flex-1">
              Showing orders with <strong>Inventory</strong> status — ready for dispatch.
            </p>
            <span
              style={{
                padding: "4px 12px",
                background: "#f0fdfa",
                color: "#0f766e",
                border: "1px solid #99f6e4",
                borderRadius: "99px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {dispatchVisible.length} orders
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading…</div>
          ) : dispatchVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🚚</div>
              <p className="font-medium">No orders in Inventory</p>
              <p className="text-sm mt-1">Orders move here once their status is set to "Inventory"</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-xs text-gray-500 font-semibold border-b border-gray-100"
                    style={{ background: "#f8fdf8" }}
                  >
                    <th className="text-left px-4 py-3">DI No.</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Products</th>
                    <th className="text-right px-4 py-3">Total Qty</th>
                    <th className="text-left px-4 py-3">ETD</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchVisible.map((order) => {
                    const days = etdDays(order.estimatedDispatchDate);
                    const overdue = days !== null && days < 0;
                    const totalQty = order.items.reduce(
                      (n, it) => n + parseFloat(it.totalQty || 0), 0,
                    );
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-50 hover:bg-green-50 transition cursor-pointer"
                        onClick={() => setDispatchOrder(order)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">
                          {order.diNo}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {fmtDate(order.orderReceivedDate)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {order.customerName}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {order.items.map((it) => it.inhouseProductName).join(", ")}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {totalQty} {order.items[0]?.totalUom || "KG"}
                        </td>
                        <td className={`px-4 py-3 text-xs ${overdue ? "text-red-500 font-semibold" : days !== null && days <= 7 ? "text-orange-500 font-semibold" : "text-gray-500"}`}>
                          {fmtDate(order.estimatedDispatchDate)}
                          {days !== null && (overdue ? ` (${Math.abs(days)}d overdue)` : days <= 7 ? ` (${days}d)` : "")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDispatchOrder(order); }}
                            className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background: BRAND }}
                          >
                            Dispatch
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Order History ────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div>
          <SalesFilterBar
            filters={filters}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            total={ordersVisible.length}
          />
          <OrderHistory
            orders={ordersVisible}
            loading={loading}
            total={ordersVisible.length}
            onOpenDispatch={setDispatchOrder}
          />
        </div>
      )}

      {/* Dispatch modal */}
      {dispatchOrder && (
        <DispatchOrder
          order={dispatchOrder}
          onSave={handleDispatchSave}
          onDelete={handleDelete}
          onClose={() => setDispatchOrder(null)}
        />
      )}

      {/* New / Edit order modal */}
      {showForm && (
        <NewOrderModal
          editing={editing}
          products={products}
          profiles={profiles}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
};

export default SalesOrder;
