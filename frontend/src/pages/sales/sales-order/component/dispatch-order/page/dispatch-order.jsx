import { useState } from "react";
import { salesOrderApi } from "../../../../../../api/sales.js";
import {
  BRAND,
  LABEL_TYPES,
  STATUS_STYLE,
  STATUS_LABELS,
} from "../../../shared/constants.js";
import { Button, IconButton } from "../../../../../../components/ui";
import { X, Trash2, Truck } from "lucide-react";
import DispatchLineCard from "../components/DispatchLineCard.jsx";
import DispatchEntryFields from "../components/DispatchEntryFields.jsx";
import { toTitleCase } from "../../../../../../utils/textDisplay.js";

// Statuses that can be dispatched right now
const DISPATCHABLE = ["IN_INVENTORY", "READY_TO_DISPATCH", "PACKED"];

export default function DispatchOrder({ order, onSave, onDelete, onClose }) {
  const today = new Date().toISOString().split("T")[0];

  const [saving, setSaving] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState(order.invoiceNo || "");
  const [transportName, setTransportName] = useState(toTitleCase(order.transportName) || "");
  const [dispatchedBy, setDispatchedBy] = useState(order.dispatchedBy || "");
  const [remarks, setRemarks] = useState(order.remarks || "");
  const [partialToggles, setPartialToggles] = useState({});
  const [partialQty, setPartialQty] = useState({});

  // ── Determine overall status for the header badge ─────────────────────────
  const dominantStatus = order.items.every((it) => it.status === "DISPATCHED")
    ? "DISPATCHED"
    : order.items.find((it) =>
        ["READY_TO_DISPATCH", "IN_INVENTORY", "PACKED"].includes(it.status),
      )?.status ||
      order.items[0]?.status ||
      "PENDING";

  const isAlreadyDispatched = dominantStatus === "DISPATCHED";

  // ── Normalise line data ───────────────────────────────────────────────────
  const lines = order.items.map((it) => ({
    id: it.id,
    productName: toTitleCase(it.inhouseProductName || it.customerProductName),
    totalQty: it.totalQty,
    totalUom: it.totalUom || "KG",
    batchNo: it.batchNo || "—",
    mrp: it.mrp || "—",
    mfgDate: it.mfgDate
      ? new Date(it.mfgDate).toLocaleDateString("en-IN")
      : "—",
    expDate: it.expDate
      ? new Date(it.expDate).toLocaleDateString("en-IN")
      : "—",
    primaryPack: it.unitPackType || "—",
    secondaryPack: it.packingType || "—",
    noOfUnits: it.unitQty ? `${it.unitQty} ${it.unitUom || "KG"}` : "—",
    noOfSecPacks: it.totalCS || "—",
    labelType: it.labelType
      ? LABEL_TYPES.find((l) => l.value === it.labelType)?.label || it.labelType
      : "—",
    currentStatus: it.status,
    totalCSNum: parseInt(it.totalCS) || 0,
    canDispatch: DISPATCHABLE.includes(it.status),
  }));

  // Split into dispatchable vs. blocked
  const readyLines   = lines.filter((l) => l.canDispatch);
  const blockedLines = lines.filter((l) => !l.canDispatch);
  const hasMixed     = readyLines.length > 0 && blockedLines.length > 0;

  // ── Mark as dispatched ────────────────────────────────────────────────────
  async function markDispatched() {
    setSaving(true);
    try {
      await salesOrderApi.patchDispatch(order.id, {
        invoiceNo,
        transportName,
        dispatchedBy,
        remarks,
        invoiceDate: today,
      });
      // Only dispatch lines that are ready — skip PLANNED, PENDING, IN_PRODUCTION, etc.
      for (const line of readyLines) {
        if (partialToggles[line.id]) {
          const dispatched = parseInt(partialQty[line.id] || 0);
          const isFullyDispatched =
            dispatched >= line.totalCSNum && line.totalCSNum > 0;
          await salesOrderApi.updateItem(line.id, {
            status: isFullyDispatched ? "DISPATCHED" : line.currentStatus,
          });
        } else {
          await salesOrderApi.updateItem(line.id, { status: "DISPATCHED" });
        }
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

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
              {toTitleCase(order.customerName)} — {(order.company || '').toUpperCase()}
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              {order.items.length} product line
              {order.items.length !== 1 ? "s" : ""}
              {hasMixed && (
                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full">
                  {readyLines.length} ready · {blockedLines.length} pending production
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

          {/* Mixed-status notice */}
          {hasMixed && !isAlreadyDispatched && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Partial dispatch — {readyLines.length} of {lines.length} items ready</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Items in <strong>Inventory</strong> status will be dispatched now.
                  Items still in production (Planned / In Production) will remain unchanged
                  and can be dispatched in a separate dispatch once ready.
                </p>
              </div>
            </div>
          )}

          {/* Production details — read only */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Production Details — Verification
              </p>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                Read Only
              </span>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <DispatchLineCard
                  key={line.id}
                  line={line}
                  idx={idx}
                  isAlreadyDispatched={isAlreadyDispatched}
                  partialToggle={partialToggles[line.id]}
                  onTogglePartial={(checked) => setPartialToggles((t) => ({ ...t, [line.id]: checked }))}
                  partialQtyValue={partialQty[line.id]}
                  onChangePartialQty={(val) => setPartialQty((q) => ({ ...q, [line.id]: val }))}
                />
              ))}
            </div>
          </div>

          {/* Dispatch entry fields */}
          {!isAlreadyDispatched && readyLines.length > 0 && (
            <DispatchEntryFields
              invoiceNo={invoiceNo} setInvoiceNo={setInvoiceNo}
              transportName={transportName} setTransportName={setTransportName}
              dispatchedBy={dispatchedBy} setDispatchedBy={setDispatchedBy}
              remarks={remarks} setRemarks={setRemarks}
            />
          )}

          {isAlreadyDispatched && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800 font-semibold text-center">
              ✅ This order has been dispatched.
              {order.invoiceNo && (
                <span className="ml-2 font-normal text-green-700">
                  Invoice: {order.invoiceNo}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => onDelete(order)}
          >
            Delete Order
          </Button>
          <div className="flex gap-3">
            {!isAlreadyDispatched && readyLines.length > 0 && (
              <Button
                variant="success"
                icon={Truck}
                loading={saving}
                disabled={saving}
                onClick={markDispatched}
              >
                {saving
                  ? "Processing…"
                  : hasMixed
                  ? `Dispatch ${readyLines.length} Ready Item${readyLines.length !== 1 ? "s" : ""}`
                  : "Mark as Dispatched"}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
