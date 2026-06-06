import { useState } from "react";
import { packsApi } from "../../../../api/client.js";
import { usePacks } from "../hooks/usePacks.js";

const STATUS_COLORS = {
  AWAITING_INWARD: "bg-yellow-100 text-yellow-800",
  INWARDED: "bg-blue-100 text-blue-800",
  PARTIALLY_ISSUED: "bg-orange-100 text-orange-800",
  EXHAUSTED: "bg-gray-100 text-gray-500",
};

const statusColor = (s) => STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600";

const HEADERS = [
  "Pack ID",
  "Item",
  "Lot",
  "Bag",
  "Qty",
  "Supplier",
  "Received",
  "Status",
  "Label",
];

export default function PackTable({ reloadTrigger }) {
  const [filterCode, setFilterCode] = useState("");
  const { packs, loading } = usePacks(filterCode, reloadTrigger);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Pack Records</h2>
        <input
          value={filterCode}
          onChange={(e) => setFilterCode(e.target.value)}
          placeholder="Filter by item code..."
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 py-4">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 font-semibold text-gray-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packs.length === 0 ? (
                <tr>
                  <td
                    colSpan={HEADERS.length}
                    className="text-center py-8 text-gray-400"
                  >
                    No packs found
                  </td>
                </tr>
              ) : (
                packs.map((p) => (
                  <tr
                    key={p.packId}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-blue-700">
                      {p.packId}
                    </td>
                    <td className="px-3 py-2 text-xs">{p.itemName}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {p.lotNo}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {String(p.bagNo).padStart(3, "0")}
                    </td>
                    <td className="px-3 py-2">
                      {p.packQty} {p.uom}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {p.supplier || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {p.receivedDate
                        ? new Date(p.receivedDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={packsApi.labelUrl(p.packId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        🖨️ Print
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
