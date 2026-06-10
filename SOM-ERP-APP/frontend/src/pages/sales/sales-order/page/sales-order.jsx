import { useState, useEffect, useCallback } from "react";
import {
  salesOrderApi,
  productApi,
  customerProfileApi,
  cpProfileApi,
} from "../../../../api/client.js";
import { STATIC_CUSTOMER_PROFILES } from "../../../../data/customerProfiles";
import {
  COMPANIES,
  STATUSES,
  STATUS_STYLE,
  STATUS_LABELS,
  BRAND,
} from "../shared/constants.js";
import { fmtDate, etdDays } from "../shared/utils.js";
import CreateSalesOrder from "../component/create-sales-order.jsx";
import DispatchOrder from "../component/dispatch-order.jsx";
import OrderHistory from "../component/order-history.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// SalesOrder — main page
// Pure orchestrator: owns top-level state, makes API calls, renders the
// three-tab layout. All heavy UI is delegated to the component folder.
//
//   Tab 1 — "Sales Orders"   → order list + CreateSalesOrder form
//   Tab 2 — "Dispatch"       → dispatch table + DispatchOrder modal
//   Tab 3 — "Order History"  → OrderHistory table
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
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCompany, setFilterCompany] = useState("ALL");
  const [dispatchFilter, setDispatchFilter] = useState("ALL");

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, prodRes] = await Promise.all([
        salesOrderApi.list({}),
        productApi.list({}),
      ]);
      setOrders(ordRes.data);
      setProducts(prodRes.data || []);
      // Merge DB customer profiles on top of the static seed data
      try {
        const profRes = await customerProfileApi.list();
        if (profRes.data?.length > 0) {
          setProfiles((prev) => {
            const merged = [...prev];
            for (const p of profRes.data) {
              if (!merged.find((x) => x.customerName === p.customerName))
                merged.push(p);
            }
            return merged.sort(
              (a, b) => (b.orderCount || 0) - (a.orderCount || 0),
            );
          });
        }
      } catch {
        /* non-critical — static data is sufficient */
      }
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save handler ──────────────────────────────────────────────────────────
  async function handleSave(form) {
    let sfgResult = null;
    if (editing) {
      await salesOrderApi.update(editing.id, form);
    } else {
      const res = await salesOrderApi.create(form);
      if (res?.sfgAvailability?.length) sfgResult = res.sfgAvailability;
    }
    // Persist customer-level memory
    if (form.customerName?.trim()) {
      try {
        await customerProfileApi.upsert({
          customerName: form.customerName.trim().toUpperCase(),
          company: form.company || "",
          orderType: form.orderType || "DOMESTIC",
        });
      } catch {
        /* non-critical */
      }
    }
    // Persist customer-product deep memory
    if (form.customerName?.trim() && form.items?.length) {
      try {
        const toSave = form.items.filter((it) =>
          it.customerProductName?.trim(),
        );
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
      } catch {
        /* non-critical */
      }
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

  // ── Derived state ─────────────────────────────────────────────────────────
  const summary = STATUSES.reduce((acc, s) => {
    acc[s] = orders.reduce(
      (n, o) => n + o.items.filter((it) => it.status === s).length,
      0,
    );
    return acc;
  }, {});

  const totalOpen = orders.filter((o) =>
    o.items.some((it) => it.status !== "DISPATCHED"),
  ).length;

  const ordersVisible = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.diNo.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "ALL" ||
      o.items.some((it) => it.status === filterStatus);
    const matchCompany = filterCompany === "ALL" || o.company === filterCompany;
    return matchSearch && matchStatus && matchCompany;
  });

  const dispatchVisible = orders.filter(
    (o) =>
      dispatchFilter === "ALL" ||
      o.items.some((it) => it.status === dispatchFilter),
  );

  const TABS = [
    { key: "orders", label: "Sales Orders", count: totalOpen },
    {
      key: "dispatch",
      label: "Dispatch",
      count: summary["READY_TO_DISPATCH"] || 0,
    },
    { key: "history", label: "Order", count: orders.length },
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
                        <span
                          className={
                            s.sfgQty >= s.orderedQty
                              ? " text-green-600"
                              : " text-orange-600"
                          }
                        >
                          {" "}
                          (ordered {s.orderedQty} {s.uom}
                          {s.sfgQty >= s.orderedQty
                            ? " — fully covered ✓"
                            : " — partial"}
                          )
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-2">
                Inform the planner — these products can be packed directly from
                SFG stock.
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
          {/* Status summary pills */}
          <div className="grid grid-cols-4 gap-3 mb-5 lg:grid-cols-7">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() =>
                  setFilterStatus((prev) => (prev === s ? "ALL" : s))
                }
                className={`text-center p-3 rounded-xl border transition ${
                  filterStatus === s
                    ? `${STATUS_STYLE[s]} border-current`
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-xl font-bold text-gray-900">
                  {summary[s]}
                </div>
                <div
                  className={`text-xs mt-0.5 ${filterStatus === s ? "" : "text-gray-500"}`}
                >
                  {STATUS_LABELS[s]}
                </div>
              </button>
            ))}
          </div>

          {/* Filter bar + New Order button */}
          <div className="flex flex-wrap gap-3 mb-5 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or order…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Companies</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            {!showForm && (
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-1.5"
                style={{ background: BRAND }}
              >
                + New Order
              </button>
            )}
          </div>

          {/* Create / edit form */}
          {showForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-800 mb-5">
                {editing ? `Edit — ${editing.soId}` : "New Sales Order"}
              </h2>
              <CreateSalesOrder
                initial={editing || undefined}
                products={products}
                profiles={profiles}
                onSave={handleSave}
                onCancel={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              />
            </div>
          )}

          {/* Order cards */}
          {/* {loading ? (
            <div className="text-center py-16 text-gray-400">Loading…</div>
          ) : ordersVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-medium">No orders found</p>
              <p className="text-sm mt-1">Click "+ New Order" to add one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ordersVisible.map((order) => {
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
                          <span className="font-bold text-gray-900">
                            {order.diNo}
                          </span>
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
                          <span>
                            {order.items.length} product
                            {order.items.length !== 1 ? "s" : ""}
                          </span>
                          {days !== null && (
                            <span
                              className={
                                overdue
                                  ? "text-red-500 font-semibold"
                                  : days <= 7
                                    ? "text-orange-500 font-semibold"
                                    : ""
                              }
                            >
                              ETD: {fmtDate(order.estimatedDispatchDate)}
                              {overdue
                                ? ` (${Math.abs(days)}d overdue)`
                                : days === 0
                                  ? " (today)"
                                  : ` (${days}d)`}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {order.items.map((it) => (
                            <span
                              key={it.id}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[it.status] || "bg-gray-100 text-gray-600"}`}
                            >
                              {it.inhouseProductName} —{" "}
                              {STATUS_LABELS[it.status] || it.status}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <button
                          onClick={() => {
                            setEditing(order);
                            setShowForm(true);
                          }}
                          className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDispatchOrder(order);
                            setActiveTab("dispatch");
                          }}
                          className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: BRAND }}
                        >
                          Dispatch
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )} */}
        </div>
      )}

      {/* ── Tab: Dispatch ─────────────────────────────────────────────── */}
      {activeTab === "dispatch" && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm text-gray-500 flex-1">
              Click any order to open the dispatch form.
            </p>
            <select
              value={dispatchFilter}
              onChange={(e) => setDispatchFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading…</div>
          ) : dispatchVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🚚</div>
              <p className="font-medium">No orders</p>
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
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">ETD</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchVisible.map((order) => {
                    const days = etdDays(order.estimatedDispatchDate);
                    const overdue = days !== null && days < 0;
                    const totalQty = order.items.reduce(
                      (n, it) => n + parseFloat(it.totalQty || 0),
                      0,
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
                          {order.items
                            .map((it) => it.inhouseProductName)
                            .join(", ")}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {totalQty} {order.items[0]?.totalUom || "KG"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[order.items[0]?.status] || "bg-gray-100 text-gray-600"}`}
                          >
                            {STATUS_LABELS[order.items[0]?.status] ||
                              order.items[0]?.status}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-xs ${overdue ? "text-red-500 font-semibold" : days !== null && days <= 7 ? "text-orange-500 font-semibold" : "text-gray-500"}`}
                        >
                          {fmtDate(order.estimatedDispatchDate)}
                          {days !== null &&
                            (overdue
                              ? ` (${Math.abs(days)}d overdue)`
                              : days <= 7
                                ? ` (${days}d)`
                                : "")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDispatchOrder(order);
                            }}
                            className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background: BRAND }}
                          >
                            Open
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
        <OrderHistory
          orders={orders}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          filterCompany={filterCompany}
          onCompanyChange={setFilterCompany}
          onOpenDispatch={setDispatchOrder}
        />
      )}

      {/* Dispatch modal — rendered at root so it overlays all tabs */}
      {dispatchOrder && (
        <DispatchOrder
          order={dispatchOrder}
          onSave={handleDispatchSave}
          onDelete={handleDelete}
          onClose={() => setDispatchOrder(null)}
        />
      )}
    </div>
  );
};

export default SalesOrder;

// ─────────────────────────────────────────────────────────────────────────────
// SalesOrder — main page
// Pure orchestrator: owns top-level state, makes API calls, renders the
