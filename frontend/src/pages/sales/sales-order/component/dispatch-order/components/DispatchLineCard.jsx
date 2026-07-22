import { BRAND, STATUS_STYLE, STATUS_LABELS } from "../../../shared/constants.js";

export default function DispatchLineCard({
  line, idx, isAlreadyDispatched,
  partialToggle, onTogglePartial,
  partialQtyValue, onChangePartialQty,
}) {
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
          {!line.canDispatch && (
            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
              🔒 Cannot dispatch
            </span>
          )}
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[line.currentStatus] || "bg-gray-100 text-gray-600"}`}
        >
          {STATUS_LABELS[line.currentStatus] || line.currentStatus}
        </span>
      </div>

      {/* Production detail grid */}
      <div className="p-4 grid grid-cols-5 gap-3">
        {[
          ["Total Qty", `${line.totalQty} ${line.totalUom}`, true],
          ["Batch No.", line.batchNo, true],
          ["MRP", line.mrp, false],
          ["Mfg. Date", line.mfgDate, false],
          ["Exp. Date", line.expDate, false],
          ["Primary Pack", line.primaryPack, false],
          ["Secondary Pack", line.secondaryPack, false],
          ["Unit Per Sec. Pack", line.noOfUnits, false],
          ["No. of Sec. Packs", line.noOfSecPacks, true],
          ["Label Type", line.labelType, false],
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

      {/* Bottom section — partial dispatch toggle OR blocked notice */}
      {!isAlreadyDispatched && (
        line.canDispatch ? (
          <div className="px-4 pb-4">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={!!partialToggle}
                  onChange={(e) => onTogglePartial(e.target.checked)}
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors ${partialToggle ? "bg-green-500" : "bg-gray-300"}`}
                />
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${partialToggle ? "translate-x-4" : ""}`}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600">
                Partial Dispatch
              </span>
            </label>

            {partialToggle && (
              <div className="mt-2 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <label className="text-xs text-amber-800 font-semibold whitespace-nowrap">
                  Sec. Packs Dispatching Now:
                </label>
                <input
                  type="number"
                  min="0"
                  max={line.totalCSNum || 9999}
                  value={partialQtyValue || ""}
                  onChange={(e) => onChangePartialQty(e.target.value)}
                  className="w-24 border border-amber-300 rounded-lg px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="0"
                />
                {line.totalCSNum > 0 && partialQtyValue && (
                  <span className="text-xs text-amber-700">
                    of {line.totalCSNum} total
                    {parseInt(partialQtyValue || 0) >= line.totalCSNum
                      ? " — full dispatch ✓"
                      : ` — ${line.totalCSNum - parseInt(partialQtyValue || 0)} remaining`}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
              This item is <strong className="text-gray-500">{STATUS_LABELS[line.currentStatus] || line.currentStatus}</strong> — it will go to production first and can be dispatched separately once ready.
            </p>
          </div>
        )
      )}
    </div>
  );
}
