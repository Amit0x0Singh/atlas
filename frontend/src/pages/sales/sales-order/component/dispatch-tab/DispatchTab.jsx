import { useState } from "react";
import Pagination from "../../../../../components/pagination/Pagination.jsx";
import DispatchRow from "./DispatchRow.jsx";

export default function DispatchTab({ dispatchVisible, loading, expandedDispatch, onToggle, onDispatch }) {
  const [dispatchPage, setDispatchPage] = useState(1);
  const [dispatchLimit, setDispatchLimit] = useState(15);
  const paginatedDispatch = dispatchVisible.slice((dispatchPage - 1) * dispatchLimit, dispatchPage * dispatchLimit);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <p className="text-sm text-gray-500 flex-1">
          Showing orders with <strong>Inventory</strong> status — ready for
          dispatch.
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
          <p className="text-sm mt-1">
            Orders move here once their status is set to "Inventory"
          </p>
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
                <th className="text-right px-4 py-3">Total Qty</th>
                <th className="text-left px-4 py-3">ETD</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-center px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDispatch.map((order) => (
                <DispatchRow
                  key={order.id}
                  order={order}
                  expanded={expandedDispatch.has(order.id)}
                  onToggle={() => onToggle(order.id)}
                  onDispatch={() => onDispatch(order)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && dispatchVisible.length > dispatchLimit && (
        <div className="px-4 pb-3 mt-2">
          <Pagination page={dispatchPage} total={dispatchVisible.length} limit={dispatchLimit} onChange={setDispatchPage} onLimitChange={l => { setDispatchLimit(l); setDispatchPage(1) }} />
        </div>
      )}
    </div>
  );
}
