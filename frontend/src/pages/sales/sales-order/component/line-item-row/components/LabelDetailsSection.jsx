import { LABEL_NEEDS_DETAILS } from "../../../shared/constants.js";
import { useOptionValues } from "../../../../../../hooks/useOptionValues.js";
import { addDays } from "../../../shared/utils.js";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none";
const label = "block text-xs font-semibold text-gray-500 mb-1";

export default function LabelDetailsSection({ item, set }) {
  const showLabelDetails = LABEL_NEEDS_DETAILS.has(item.labelType);
  const { data: labelTypes = [] } = useOptionValues('LABEL_TYPE')

  return (
    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
        Label Details
      </p>
      <div style={{ maxWidth: "260px" }}>
        <label className={label}>Label Type</label>
        <select value={item.labelType || ""} onChange={(e) => set("labelType", e.target.value)} className={field}>
          <option value="">— Select —</option>
          {labelTypes.map((lt) => (
            <option key={lt.code} value={lt.code}>{lt.label}</option>
          ))}
        </select>
        {item.labelType && !LABEL_NEEDS_DETAILS.has(item.labelType) && (
          <p style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>No print details needed</p>
        )}
      </div>

      {showLabelDetails && (
        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "12px",
            background: "#f0fdf4",
            border: "1px solid #dcfce7",
            borderRadius: "10px",
            padding: "12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>Batch No.</label>
            <input
              value={item.batchNo || ""}
              onChange={(e) => set("batchNo", e.target.value)}
              className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="e.g. GAS250601"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>Mfg. Date</label>
            <input
              type="date"
              value={item.mfgDate || ""}
              onChange={(e) => {
                set("mfgDate", e.target.value);
                if (item._shelfLifeDays && e.target.value)
                  set("expDate", addDays(e.target.value, item._shelfLifeDays));
              }}
              className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>Exp. Date</label>
            <input
              type="date"
              value={item.expDate || ""}
              onChange={(e) => set("expDate", e.target.value)}
              className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "4px" }}>MRP (₹)</label>
            <input
              type="number"
              value={item.mrp || ""}
              onChange={(e) => set("mrp", e.target.value)}
              className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="optional"
              min="0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
