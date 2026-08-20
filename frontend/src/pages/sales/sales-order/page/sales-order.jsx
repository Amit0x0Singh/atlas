import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { customerProfileApi, cpProfileApi } from "../../../../api/sales.js";
import {
  useSalesOrders, useCreateSalesOrder, useUpdateSalesOrder, useDeleteSalesOrder,
} from "../../../../hooks/sales/useSalesOrders.js";
import { useProductSuggestions } from "../../../../hooks/masters/useProducts.js";
import { useCustomerProfiles } from "../../../../hooks/sales/useCustomerProfiles.js";
import { queryKeys } from "../../../../lib/queryKeys.js";
import { STATUSES } from "../shared/constants.js";
import NewOrderModal from "../component/new-order-modal/NewOrderModal.jsx";
import SfgAvailabilityAlert from "../component/sfg-availability-alert/SfgAvailabilityAlert.jsx";
import SalesOrderTabs from "../component/sales-order-tabs/SalesOrderTabs.jsx";
import OrdersTab from "../component/orders-tab/OrdersTab.jsx";
import DispatchTab from "../component/dispatch-tab/DispatchTab.jsx";
import DispatchOrder from "../component/dispatch-order/page/dispatch-order.jsx";
import OrderHistory from "../component/order-history/order-history.jsx";
import SalesFilterBar from "../component/sales-filter-bar/SalesFilterBar.jsx";
import { BackButton, PageHeader } from "../../../../components/ui";
import { ShoppingCart } from "lucide-react";

const EMPTY_FILTERS = {
  search: "",
  status: "",
  company: "",
  from_date: "",
  to_date: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// SalesOrder — main page
// ─────────────────────────────────────────────────────────────────────────────
const SalesOrder = () => {
  const qc = useQueryClient();

  // ── Core data ─────────────────────────────────────────────────────────────
  const ordersQuery = useSalesOrders({});
  const orders = ordersQuery.data ?? [];
  const loading = ordersQuery.isLoading;
  const err = ordersQuery.error?.message ?? "";

  const { data: productsResult } = useProductSuggestions();
  const products = productsResult?.items ?? [];

  // Backend already returns these sorted by orderCount desc, customerName asc
  // (see GET /api/customer-profiles) — no client-side merge/sort needed.
  const { data: profiles = [] } = useCustomerProfiles();

  const createOrder = useCreateSalesOrder();
  const updateOrder = useUpdateSalesOrder();
  const deleteOrder = useDeleteSalesOrder();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("orders");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [sfgAlert, setSfgAlert] = useState(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // ── Dispatch expandable rows ───────────────────────────────────────────────
  const [expandedDispatch, setExpandedDispatch] = useState(new Set());

  const toggleDispatch = (id) =>
    setExpandedDispatch((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Save handler ──────────────────────────────────────────────────────────
  async function handleSave(form) {
    let sfgResult = null;
    if (editing) {
      await updateOrder.mutateAsync({ id: editing.id, data: form });
    } else {
      const res = await createOrder.mutateAsync(form);
      if (res?.sfgAvailability?.length) sfgResult = res.sfgAvailability;
    }
    if (form.customerName?.trim()) {
      try {
        await customerProfileApi.upsert({
          customerName: form.customerName.trim().toUpperCase(),
          company: form.company || "",
          orderType: form.orderType || "DOMESTIC",
        });
        qc.invalidateQueries({ queryKey: queryKeys.customerProfiles.all() });
      } catch {
        /* non-critical */
      }
    }
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
  }

  async function handleDelete(order) {
    if (!confirm(`Delete order ${order.diNo}?`)) return;
    await deleteOrder.mutateAsync(order.id);
    setDispatchOrder(null);
  }

  async function handleDispatchSave() {
    // DispatchOrder calls salesOrderApi directly (not yet migrated to a
    // mutation hook), so the list needs an explicit invalidation here.
    qc.invalidateQueries({ queryKey: queryKeys.salesOrders.all() });
    setDispatchOrder(null);
  }

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => setFilters(EMPTY_FILTERS);

  // ── Derived state ─────────────────────────────────────────────────────────

  const summary = STATUSES.reduce((acc, s) => {
    acc[s] = orders.reduce(
      (n, o) => n + o.items.filter((it) => it.status === s).length,
      0,
    );
    return acc;
  }, {});

  // History tab — client-side filtered
  const ordersVisible = orders.filter((o) => {
    const q = filters.search.toLowerCase();
    const matchSearch =
      !q ||
      o.customerName?.toLowerCase().includes(q) ||
      o.diNo?.toLowerCase().includes(q);
    const matchStatus =
      !filters.status || o.items.some((it) => it.status === filters.status);
    const matchCompany = !filters.company || o.company === filters.company;
    const d = o.orderReceivedDate ? new Date(o.orderReceivedDate) : null;
    const matchFrom =
      !filters.from_date || (d && d >= new Date(filters.from_date));
    const matchTo =
      !filters.to_date || (d && d <= new Date(filters.to_date + "T23:59:59"));
    return matchSearch && matchStatus && matchCompany && matchFrom && matchTo;
  });

  // Dispatch tab — only IN_INVENTORY orders
  const dispatchVisible = orders.filter((o) =>
    o.items.some((it) => it.status === "IN_INVENTORY"),
  );

  const TABS = [
    { key: "orders", label: "Sales Orders", count: orders.length },
    { key: "dispatch", label: "Dispatch", count: dispatchVisible.length },
    { key: "history", label: "Order History", count: ordersVisible.length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={ShoppingCart}
        title="Sales Orders"
        description={`Atlas — ${orders.length} orders total`}
        actions={<BackButton />}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
      {err && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          {err}
        </div>
      )}

      {sfgAlert && (
        <SfgAvailabilityAlert sfgAlert={sfgAlert} onDismiss={() => setSfgAlert(null)} />
      )}

      <SalesOrderTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(key) => { setActiveTab(key); setShowForm(false); }}
      />

      {activeTab === "orders" && (
        <OrdersTab summary={summary} onNewOrder={() => { setEditing(null); setShowForm(true); }} />
      )}

      {activeTab === "dispatch" && (
        <DispatchTab
          dispatchVisible={dispatchVisible}
          loading={loading}
          expandedDispatch={expandedDispatch}
          onToggle={toggleDispatch}
          onDispatch={setDispatchOrder}
        />
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
            filterKey={filters}
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
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
      </div>
    </div>
  );
};

export default SalesOrder;
