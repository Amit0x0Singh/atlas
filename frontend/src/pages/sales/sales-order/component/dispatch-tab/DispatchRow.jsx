import { Fragment } from "react";
import { Clock } from "lucide-react";
import { Button } from "../../../../../components/ui";
import { STATUS_STYLE, STATUS_LABELS } from "../../shared/constants.js";
import { fmtDate, etdDays, dispatchProgressLabel } from "../../shared/utils.js";
import { toTitleCase } from "../../../../../utils/textDisplay.js";
import { useUserDisplayNames } from "../../../../../hooks/masters/useUserDisplayNames.js";

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  : '—'

export default function DispatchRow({ order, expanded, onToggle, onDispatch }) {
  const displayName = useUserDisplayNames();
  const days = etdDays(order.estimatedDispatchDate);
  const overdue = days !== null && days < 0;
  // Dispatch is tracked in Secondary Pack count (totalCS), not the line's KG
  // total — only lines that actually have a pack qty set contribute here;
  // remainingQty comes back `null` (not 0) for a line that doesn't, so it's
  // correctly excluded rather than silently miscounted as "0 remaining".
  const packLines = order.items.filter((it) => it.remainingQty != null);
  const totalPacks = packLines.reduce((n, it) => n + Number(it.totalCS || 0), 0);
  const remainingPacks = packLines.reduce((n, it) => n + Math.max(0, Number(it.remainingQty || 0)), 0);

  return (
    <Fragment>
      {/* ── Main row ── */}
      <tr className="border-b border-gray-50 hover:bg-green-50 transition">
        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">
          {order.diNo}
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">
          {fmtDate(order.orderReceivedDate)}
        </td>
        <td className="px-4 py-3 font-semibold text-gray-800">
          {toTitleCase(order.customerName)}
        </td>
        <td className="px-4 py-3 text-right text-xs">
          {packLines.length ? (
            <>
              <div className="font-bold text-amber-600">{remainingPacks} packs</div>
              <div className="text-[10px] text-gray-400">of {totalPacks} ordered</div>
            </>
          ) : (
            <span className="text-gray-300">— no pack qty set</span>
          )}
        </td>
        <td
          className={`px-4 py-3 text-xs ${overdue ? "text-red-500 font-semibold" : days !== null && days <= 7 ? "text-orange-500 font-semibold" : "text-gray-500"}`}
        >
          {fmtDate(order.estimatedDispatchDate)}
          {days !== null &&
            (overdue
              ? ` (${Math.abs(days)}d overdue)`
              : days <= 7 && days >= 0
                ? ` (${days}d)`
                : "")}
        </td>

        {/* Items toggle */}
        <td className="px-4 py-3">
          <Button
            variant={expanded ? "outline" : "outline-gray"}
            size="xs"
            onClick={onToggle}
          >
            {expanded ? "▲" : "▼"} {order.items.length} item
            {order.items.length !== 1 ? "s" : ""}
          </Button>
        </td>

        <td className="px-4 py-3 text-center">
          <Button variant="success" size="xs" onClick={onDispatch}>
            Dispatch
          </Button>
        </td>
      </tr>

      {/* ── Expandable items sub-row ── */}
      {expanded && (
        <tr style={{ background: "#f8fafc" }}>
          <td colSpan={7} style={{ padding: "0 20px 12px" }}>
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                overflow: "hidden",
                marginTop: "6px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {[
                      "Product",
                      "Ordered (KG)",
                      "Remaining Packs",
                      "Packing",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign:
                            h === "Ordered (KG)" || h === "Remaining Packs" ? "right" : "left",
                          padding: "6px 12px",
                          color: "#64748b",
                          fontWeight: 700,
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr
                      key={it.id || idx}
                      style={{
                        borderTop: "1px solid #e2e8f0",
                        background:
                          idx % 2 === 0 ? "#fff" : "#fafafa",
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#1e293b",
                        }}
                      >
                        {toTitleCase(it.inhouseProductName) || "—"}
                        {it.customerProductName &&
                          it.customerProductName !==
                            it.inhouseProductName && (
                            <span
                              style={{
                                marginLeft: "6px",
                                fontSize: "10px",
                                color: "#94a3b8",
                                fontWeight: 400,
                              }}
                            >
                              ({toTitleCase(it.customerProductName)})
                            </span>
                          )}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#475569",
                        }}
                      >
                        {it.totalQty} {it.totalUom?.toUpperCase()}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: it.remainingQty == null ? "#cbd5e1" : Number(it.remainingQty) > 0 ? "#b45309" : "#94a3b8",
                        }}
                      >
                        {it.remainingQty == null ? "— no pack qty" : `${Number(it.remainingQty)} of ${it.totalCS || 0}`}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          fontSize: "11px",
                          color: "#64748b",
                        }}
                      >
                        {[it.unitPackType, it.packingType]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[dispatchProgressLabel(it)] || "bg-gray-100 text-gray-600"}`}
                        >
                          {STATUS_LABELS[dispatchProgressLabel(it)] ||
                            it.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "8px",
                fontSize: "11px",
                color: "#94a3b8",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={11} /> Created by {displayName(order.createdBy)} · {fmtDateTime(order.createdAt)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={11} /> Updated by {displayName(order.updatedBy)} · {fmtDateTime(order.updatedAt)}
              </span>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
