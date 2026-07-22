import { COMPANIES, ORDER_TYPES } from "../../../shared/constants.js";
import CustomerNamePicker from "../../customer-name-picker/CustomerNamePicker.jsx";

export default function OrderHeaderFields({ hdr, setH, profiles }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
        Order Details
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Row 1: DI No. | Customer Name */}
        <div style={{ minWidth: 0 }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">DI No. *</label>
          <input
            value={hdr.diNo || ""}
            onChange={(e) => setH("diNo", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="e.g. DVS/SO-25-001"
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name *</label>
          <CustomerNamePicker
            value={hdr.customerName}
            profiles={profiles}
            onSelect={(name, company, orderType) => {
              setH("customerName", name);
              if (company) setH("company", company);
              if (orderType) setH("orderType", orderType);
            }}
          />
          {hdr.customerName &&
            profiles.find((p) => p.customerName === hdr.customerName.toUpperCase()) && (
              <p className="mt-1 text-xs text-green-600">Auto-filled from memory</p>
            )}
        </div>

        {/* Row 2: Order Type | Company */}
        <div style={{ minWidth: 0 }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Order Type</label>
          <select
            value={hdr.orderType}
            onChange={(e) => setH("orderType", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            {ORDER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 0 }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Company</label>
          <select
            value={hdr.company}
            onChange={(e) => setH("company", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Row 3: Sales Staff | Order Date */}
        <div style={{ minWidth: 0 }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Sales Staff</label>
          <input
            value={hdr.salesStaff || ""}
            onChange={(e) => setH("salesStaff", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="Name of sales person"
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Order Date</label>
          <input
            type="date"
            value={hdr.orderReceivedDate}
            onChange={(e) => setH("orderReceivedDate", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>

        {/* Row 4: Remarks — full width */}
        <div style={{ minWidth: 0, gridColumn: "1 / -1" }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Order Remarks</label>
          <input
            value={hdr.remarks || ""}
            onChange={(e) => setH("remarks", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="Special instructions, delivery notes…"
          />
        </div>
      </div>

      <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
        <span>ℹ</span>
        <span>
          Invoice, batch details and dispatch info are filled in the{" "}
          <strong>Dispatch</strong> tab once the order reaches the inventory
          team.
        </span>
      </div>
    </div>
  );
}
