import { Clock, Truck, X } from "lucide-react";
import { BRAND, STATUS_STYLE, STATUS_LABELS, PRIORITY_STYLE } from "../../../shared/constants.js";
import { fmtDate, dispatchProgressLabel } from "../../../shared/utils.js";
import { Button, IconButton } from "../../../../../../components/ui";
import { toTitleCase } from "../../../../../../utils/textDisplay.js";
import DispatchLineCard from "../../dispatch-order/components/DispatchLineCard.jsx";

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  : '—'

// Reshapes a raw order item into the same "line" shape DispatchLineCard
// already renders on the Dispatch modal — reused here read-only (see
// isAlreadyDispatched below) so both places show dispatch progress
// identically instead of maintaining two separate card designs.
function toLine(it) {
  const dispatchedQty = Number(it.dispatchedQty) || 0;
  const hasPackQty = it.remainingQty != null;
  const remainingQty = hasPackQty ? Math.max(0, Number(it.remainingQty)) : 0;
  return {
    id: it.id,
    productName: toTitleCase(it.inhouseProductName || it.customerProductName),
    totalQty: it.totalQty,
    totalUom: (it.totalUom || "KG").toUpperCase(),
    totalCS: it.totalCS || 0,
    hasPackQty,
    dispatchedQty,
    remainingQty,
    dispatches: it.dispatches || [],
    batchNo: it.batchNo || "—",
    mrp: it.mrp || "—",
    mfgDate: it.mfgDate ? new Date(it.mfgDate).toLocaleDateString("en-IN") : "—",
    expDate: it.expDate ? new Date(it.expDate).toLocaleDateString("en-IN") : "—",
    primaryPack: it.unitPackType || "—",
    secondaryPack: it.packingType || "—",
    noOfUnits: it.unitQty ? `${it.unitQty} ${(it.unitUom || "KG").toUpperCase()}` : "—",
    currentStatus: it.status,
    progressLabel: dispatchProgressLabel(it),
    canDispatch: false,
    qtyValue: "",
  };
}

function MetaField({ label, value, full }) {
  return (
    <div className={full ? "col-span-2 sm:col-span-4" : ""}>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800 break-words">{value ?? "—"}</p>
    </div>
  );
}

/**
 * Read-only "View" panel for a Sales Order — full DI details plus every
 * product line's dispatch progress and full dispatch history, without the
 * quantity-entry controls the Dispatch modal shows. Opened from the Order
 * History table's View action; "Manage / Dispatch" hands off to the same
 * DispatchOrder modal used elsewhere for making changes.
 */
export default function OrderDetailModal({ order, onClose, onEdit, displayName }) {
  if (!order) return null;

  const dominantStatus = order.items.every((it) => it.status === "DISPATCHED")
    ? "DISPATCHED"
    : order.items.find((it) => it.status === "IN_INVENTORY")?.status ||
      order.items[0]?.status ||
      "PENDING";

  const totalDispatches = order.items.reduce((n, it) => n + (it.dispatches?.length || 0), 0);
  const lines = order.items.map(toLine);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl text-white"
          style={{ background: BRAND }}
        >
          <div>
            <h2 className="font-bold text-sm tracking-wide">
              {toTitleCase(order.customerName)} — {(order.company || "").toUpperCase()}
            </h2>
            <p className="text-xs text-white/70 mt-0.5 flex items-center flex-wrap gap-2">
              <span>
                {order.diNo} · {order.items.length} product line{order.items.length !== 1 ? "s" : ""}
              </span>
              {totalDispatches > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full">
                  {totalDispatches} dispatch{totalDispatches !== 1 ? "es" : ""} recorded
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLE[dominantStatus] || "bg-gray-100 text-gray-500"}`}
            >
              {STATUS_LABELS[dominantStatus] || dominantStatus}
            </span>
            <IconButton icon={X} tooltip="Close" variant="ghost" onClick={onClose} className="text-white/70 hover:text-white" />
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Order-level details */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetaField label="Order Date" value={fmtDate(order.orderReceivedDate)} />
            <MetaField label="ETD" value={fmtDate(order.estimatedDispatchDate)} />
            <MetaField label="Order Type" value={order.orderType} />
            <MetaField
              label="Priority"
              value={
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLE[order.priority] || "bg-gray-100 text-gray-600"}`}>
                  {toTitleCase(order.priority) || "—"}
                </span>
              }
            />
            <MetaField label="Invoice No." value={order.invoiceNo} />
            <MetaField label="Invoice Date" value={order.invoiceDate ? fmtDate(order.invoiceDate) : null} />
            <MetaField label="Transport" value={order.transportName ? toTitleCase(order.transportName) : null} />
            <MetaField label="Sales Staff" value={order.salesStaff} />
            <MetaField label="Dispatched By" value={order.dispatchedBy} />
            {order.remarks && <MetaField label="Remarks" value={order.remarks} full />}
          </div>

          {/* Product lines — same read-out as the Dispatch modal, minus the qty-entry controls */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Product Lines
            </p>
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <DispatchLineCard
                  key={line.id}
                  line={line}
                  idx={idx}
                  isAlreadyDispatched
                  onChangeQty={() => {}}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> Created by {displayName(order.createdBy)} · {fmtDateTime(order.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> Updated by {displayName(order.updatedBy)} · {fmtDateTime(order.updatedAt)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {onEdit && (
              <Button variant="outline" icon={Truck} onClick={() => onEdit(order)}>
                Manage / Dispatch
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
