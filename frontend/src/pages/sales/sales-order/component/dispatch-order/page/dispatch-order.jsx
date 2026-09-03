import { useState } from "react";
import { salesOrderApi } from "../../../../../../api/sales.js";
import {
  BRAND,
  STATUS_STYLE,
  STATUS_LABELS,
} from "../../../shared/constants.js";
import { dispatchProgressLabel } from "../../../shared/utils.js";
import { useOptionValues } from "../../../../../../hooks/useOptionValues.js";
import { Button, IconButton } from "../../../../../../components/ui";
import { Can } from "../../../../../../components/common/Can.jsx";
import { X, Trash2, Truck } from "lucide-react";
import DispatchLineCard from "../components/DispatchLineCard.jsx";
import DispatchEntryFields from "../components/DispatchEntryFields.jsx";
import { toTitleCase } from "../../../../../../utils/textDisplay.js";

// Only a line sitting in Inventory, with a Secondary Pack quantity actually
// set AND something left to send, can be dispatched right now. Dispatch is
// tracked in pack count (totalCS), not the line's KG total — the backend
// sends remainingQty back as `null` (not 0) when totalCS was never set, so
// that case can't be mistaken for "fully dispatched" here.
const isReady = (it) => it.status === "IN_INVENTORY" && it.remainingQty != null && Number(it.remainingQty) > 0.0009;

export default function DispatchOrder({ order, onSave, onDelete, onClose }) {
  const today = new Date().toISOString().split("T")[0];

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [invoiceNo, setInvoiceNo] = useState(order.invoiceNo || "");
  const [transportName, setTransportName] = useState(toTitleCase(order.transportName) || "");
  const [dispatchedBy, setDispatchedBy] = useState(order.dispatchedBy || "");
  const [remarks, setRemarks] = useState(order.remarks || "");
  // Qty the operator wants to send for each line right now — keyed by item
  // id, only populated once they actually edit a field (otherwise each
  // ready line just defaults to its full remaining quantity, see `lines`).
  const [dispatchQty, setDispatchQty] = useState({});
  const { data: labelTypes = [] } = useOptionValues('LABEL_TYPE')

  // ── Determine overall status for the header badge ─────────────────────────
  const dominantStatus = order.items.every((it) => it.status === "DISPATCHED")
    ? "DISPATCHED"
    : order.items.find((it) => it.status === "IN_INVENTORY")?.status ||
      order.items[0]?.status ||
      "PENDING";

  const isAlreadyDispatched = dominantStatus === "DISPATCHED";

  // ── Normalise line data ───────────────────────────────────────────────────
  const lines = order.items.map((it) => {
    const dispatchedQty = Number(it.dispatchedQty) || 0;
    const hasPackQty = it.remainingQty != null;
    const remainingQty = hasPackQty ? Math.max(0, Number(it.remainingQty)) : 0;
    const canDispatch = isReady(it);
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
      mfgDate: it.mfgDate
        ? new Date(it.mfgDate).toLocaleDateString("en-IN")
        : "—",
      expDate: it.expDate
        ? new Date(it.expDate).toLocaleDateString("en-IN")
        : "—",
      primaryPack: it.unitPackType || "—",
      secondaryPack: it.packingType || "—",
      noOfUnits: it.unitQty ? `${it.unitQty} ${(it.unitUom || "KG").toUpperCase()}` : "—",
      currentStatus: it.status,
      progressLabel: dispatchProgressLabel(it),
      canDispatch,
      // Defaults to "send every pack that's left" — untouched, this
      // reproduces the old one-click full dispatch; edited down, it's a
      // partial dispatch. Never auto-fills once already-DISPATCHED lines.
      qtyValue: dispatchQty[it.id] ?? (canDispatch ? String(remainingQty) : ""),
    };
  });

  // Split into dispatchable vs. blocked
  const readyLines   = lines.filter((l) => l.canDispatch);
  const blockedLines = lines.filter((l) => !l.canDispatch);
  const hasMixed     = readyLines.length > 0 && blockedLines.length > 0;

  // Lines actually queued to go out right now (qty > 0) — everything else
  // in readyLines is skipped, letting the salesperson dispatch only some of
  // the ready products in this pass and leave the rest for later.
  const queuedLines = readyLines.filter((l) => {
    const q = parseFloat(l.qtyValue);
    return !isNaN(q) && q > 0;
  });
  const overLines = queuedLines.filter((l) => parseFloat(l.qtyValue) > l.remainingQty + 0.0009);

  // ── Dispatch queued lines ─────────────────────────────────────────────────
  async function markDispatched() {
    if (!queuedLines.length || overLines.length) return;
    setSaving(true);
    setError("");
    try {
      for (const line of queuedLines) {
        await salesOrderApi.dispatchItem(line.id, {
          qty: parseFloat(line.qtyValue),
          invoiceNo,
          invoiceDate: today,
          transportName,
          dispatchedBy,
          remarks,
        });
      }
      // Order-header fields (invoice/transport/etc.) reflect the most recent
      // dispatch — each line's own dispatch row already keeps its own copy,
      // so nothing from earlier dispatches is lost.
      await salesOrderApi.patchDispatch(order.id, {
        invoiceNo, transportName, dispatchedBy, remarks, invoiceDate: today,
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Dispatch failed");
    } finally {
      setSaving(false);
    }
  }

  const setQty = (lineId, val) => setDispatchQty((q) => ({ ...q, [lineId]: val }));

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
              {order.diNo} · {order.items.length} product line
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Mixed-status notice */}
          {hasMixed && !isAlreadyDispatched && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Partial dispatch — {readyLines.length} of {lines.length} items ready</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Items in <strong>Inventory</strong> status can be dispatched now, in any quantity.
                  Items still in production will remain unchanged here and can be dispatched
                  separately once ready.
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
                  onChangeQty={(val) => setQty(line.id, val)}
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
          <Can permission="sales.order.delete" mode="disable">
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => onDelete(order)}
            >
              Delete Order
            </Button>
          </Can>
          <div className="flex items-center gap-3">
            {overLines.length > 0 && (
              <span className="text-xs font-semibold text-red-600">
                {overLines.length} line{overLines.length !== 1 ? "s" : ""} exceed{overLines.length === 1 ? "s" : ""} remaining qty
              </span>
            )}
            {!isAlreadyDispatched && readyLines.length > 0 && (
              <Can permission="sales.order.dispatch" mode="disable">
                <Button
                  variant="success"
                  icon={Truck}
                  loading={saving}
                  disabled={saving || !queuedLines.length || overLines.length > 0}
                  onClick={markDispatched}
                >
                  {saving
                    ? "Processing…"
                    : queuedLines.length
                      ? `Dispatch ${queuedLines.length} Item${queuedLines.length !== 1 ? "s" : ""}`
                      : "Enter a qty to dispatch"}
                </Button>
              </Can>
            )}
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
