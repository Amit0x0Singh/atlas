import { useState } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { BRAND, STATUS_STYLE, STATUS_LABELS } from "../../../shared/constants.js";
import { fmtDate } from "../../../shared/utils.js";
import { toTitleCase } from "../../../../../../utils/textDisplay.js";

export default function DispatchLineCard({ line, idx, isAlreadyDispatched, onChangeQty }) {
  const [showHistory, setShowHistory] = useState(false);
  const over = parseFloat(line.qtyValue) > line.remainingQty + 0.0009;
  const pct = line.totalCS > 0 ? Math.min(100, (line.dispatchedQty / line.totalCS) * 100) : 0;
  // A line stuck at Inventory status with canDispatch=false (rather than
  // still-in-production) is missing its Total CS — the pack count dispatch
  // is now measured against — not blocked by the production pipeline.
  const needsPackQty = !line.canDispatch && !line.hasPackQty && line.currentStatus === "IN_INVENTORY";

  return (
    <div
      className={`border rounded-xl overflow-hidden ${
        line.canDispatch
          ? "border-gray-200 bg-gray-50"
          : "border-gray-200 bg-gray-50/50 opacity-75"
      }`}
    >
      {/* Line header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: line.canDispatch ? "#f0fdf4" : "#f8fafc" }}
      >
        <div className="flex items-center gap-2">
          <p
            className="text-sm font-bold"
            style={{ color: line.canDispatch ? BRAND : "#64748b" }}
          >
            Line {idx + 1}: {line.productName}
          </p>
          {!line.canDispatch && line.currentStatus !== "DISPATCHED" && (
            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
              🔒 Cannot dispatch
            </span>
          )}
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[line.progressLabel] || "bg-gray-100 text-gray-600"}`}
        >
          {STATUS_LABELS[line.progressLabel] || line.progressLabel}
        </span>
      </div>

      {/* Ordered / Dispatched / Remaining — in Secondary Pack COUNT, the unit
          this line actually gets dispatched in. Ordered KG stays visible
          below as production-detail context, but doesn't drive dispatch. */}
      <div className="px-4 pt-3 flex items-center gap-5 flex-wrap">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ordered Packs</p>
          <p className="text-sm font-bold text-gray-800">{line.hasPackQty ? `${line.totalCS} packs` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Dispatched</p>
          <p className="text-sm font-bold text-gray-500">{line.hasPackQty ? `${line.dispatchedQty} packs` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Remaining</p>
          <p className={`text-sm font-bold ${line.remainingQty > 0 ? "text-amber-600" : "text-gray-400"}`}>
            {line.hasPackQty ? `${line.remainingQty} packs` : "—"}
          </p>
        </div>
        {line.hasPackQty && (
          <div className="flex-1 min-w-[100px]">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {line.dispatches.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700"
          >
            <History size={12} /> {line.dispatches.length} prior dispatch{line.dispatches.length !== 1 ? "es" : ""}
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {showHistory && line.dispatches.length > 0 && (
        <div className="mx-4 mt-2 border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-500 text-[10px] uppercase tracking-wide">
                <th className="text-left px-3 py-1.5 font-semibold">Date</th>
                <th className="text-right px-3 py-1.5 font-semibold">Qty</th>
                <th className="text-left px-3 py-1.5 font-semibold">Invoice</th>
                <th className="text-left px-3 py-1.5 font-semibold">Transport</th>
              </tr>
            </thead>
            <tbody>
              {line.dispatches.map((d) => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 text-gray-500">{fmtDate(d.dispatchedAt)}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-800">{Number(d.qty)} packs</td>
                  <td className="px-3 py-1.5 text-gray-500">{d.invoiceNo || "—"}</td>
                  <td className="px-3 py-1.5 text-gray-500">{d.transportName ? toTitleCase(d.transportName) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Production detail grid */}
      <div className="p-4 grid grid-cols-5 gap-3">
        {[
          ["Ordered Qty (KG)", `${line.totalQty} ${line.totalUom}`, false],
          ["Batch No.", line.batchNo, true],
          ["MRP", line.mrp, false],
          ["Mfg. Date", line.mfgDate, false],
          ["Exp. Date", line.expDate, false],
          ["Primary Pack", line.primaryPack, false],
          ["Secondary Pack", line.secondaryPack, false],
          ["Unit Per Sec. Pack", line.noOfUnits, false],
          ["No. of Sec. Packs", line.totalCS || "—", true],
        ].map(([label, val, bold]) => (
          <div key={label}>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p
              className={`text-sm ${bold ? "font-bold text-gray-800" : "text-gray-700"}`}
            >
              {val}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom section — qty-to-dispatch-now OR blocked notice */}
      {!isAlreadyDispatched && (
        line.canDispatch ? (
          <div className="px-4 pb-4">
            <div className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 ${over ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
              <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                Dispatch now:
              </label>
              <input
                type="number"
                min="0"
                step="1"
                max={line.remainingQty}
                value={line.qtyValue}
                onChange={(e) => onChangeQty(e.target.value)}
                className={`w-32 border rounded-lg px-2.5 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-2 ${
                  over ? "border-red-300 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                }`}
                placeholder="0"
              />
              <span className="text-xs text-gray-500">packs</span>
              <button
                type="button"
                onClick={() => onChangeQty(String(line.remainingQty))}
                className="ml-auto text-[11px] font-semibold text-green-700 hover:text-green-800"
              >
                Dispatch all remaining
              </button>
            </div>
            {over && (
              <p className="text-[11px] text-red-600 mt-1.5 font-semibold">
                Only {line.remainingQty} packs remain on this line.
              </p>
            )}
          </div>
        ) : (
          line.currentStatus !== "DISPATCHED" && (
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                {needsPackQty ? (
                  <>This item has no <strong className="text-gray-500">Secondary Pack (Total CS)</strong> quantity set — add it to the order line before it can be dispatched.</>
                ) : (
                  <>This item is <strong className="text-gray-500">{STATUS_LABELS[line.currentStatus] || line.currentStatus}</strong> — it will go to production first and can be dispatched separately once ready.</>
                )}
              </p>
            </div>
          )
        )
      )}
    </div>
  );
}
