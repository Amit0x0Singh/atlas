import { Fragment } from "react";
import { Button } from "../../../../../components/ui";
import { STATUS_STYLE, STATUS_LABELS } from "../../shared/constants.js";
import { fmtDate, etdDays } from "../../shared/utils.js";

export default function DispatchRow({ order, expanded, onToggle, onDispatch }) {
  const days = etdDays(order.estimatedDispatchDate);
  const overdue = days !== null && days < 0;
  const totalQty = order.items.reduce(
    (n, it) => n + parseFloat(it.totalQty || 0),
    0,
  );

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
          {order.customerName}
        </td>
        <td className="px-4 py-3 text-right font-semibold text-xs">
          {totalQty} {order.items[0]?.totalUom || "KG"}
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
                      "Qty",
                      "Packing",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign:
                            h === "Qty" ? "right" : "left",
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
                        {it.inhouseProductName || "—"}
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
                              ({it.customerProductName})
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
                        {it.totalQty} {it.totalUom}
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
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[it.status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {STATUS_LABELS[it.status] ||
                            it.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
