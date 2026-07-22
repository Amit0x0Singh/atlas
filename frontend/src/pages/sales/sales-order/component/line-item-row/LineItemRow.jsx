import {
  CARRIER_OPTIONS,
  UOMS,
  SECTIONS,
} from "../../shared/constants.js";
import { calcTotalCS } from "../../shared/utils.js";
import InhouseProductPicker from "../inhouse-product-picker/InhouseProductPicker.jsx";
import CustomerProductPicker from "../customer-product-picker/CustomerProductPicker.jsx";
import PackingSection from "./components/PackingSection.jsx";
import LabelDetailsSection from "./components/LabelDetailsSection.jsx";
import { Button } from "../../../../../components/ui";
import { X } from "lucide-react";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none";
const label = "block text-xs font-semibold text-gray-500 mb-1";

export default function LineItemRow({
  item,
  idx,
  products,
  cpProfiles,
  packingMaterials,   // { primary: [...], secondary: [...] }
  onChange,
  onRemove,
  onProductPicked,
  onCpProductPicked,
}) {
  const set = (k, v) => onChange(idx, { ...item, [k]: v });

  // Use API materials if available, else fall back to empty (user can type custom)
  const primaryMaterials   = packingMaterials?.primary   || []
  const secondaryMaterials = packingMaterials?.secondary || []

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "16px",
        background: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* ── Row header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Line {idx + 1}
          </span>
          {item._memApplied && (
            <span style={{ fontSize: "11px", background: "#f0fdf4", color: "#15803d", fontWeight: 600, padding: "2px 8px", borderRadius: "99px" }}>
              Memory applied
            </span>
          )}
        </div>
        <Button type="button" variant="danger" size="xs" icon={X} onClick={() => onRemove(idx)}>
          Remove
        </Button>
      </div>

      {/* ── Product names — 2 cols ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <label className={label}>
            Customer Product Name *
            {cpProfiles.length > 0 && (
              <span style={{ marginLeft: "6px", color: "#16a34a", fontWeight: 400 }}>
                ({cpProfiles.length} known)
              </span>
            )}
          </label>
          <CustomerProductPicker
            value={item.customerProductName}
            cpProfiles={cpProfiles}
            onChange={(v) => set("customerProductName", v)}
            onSelect={(profile) => onCpProductPicked(idx, profile)}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label className={label}>Inhouse Product Name</label>
          <InhouseProductPicker
            value={item.inhouseProductName}
            productCode={item.inhouseProductCode}
            products={products}
            onChange={(name, code) => {
              onChange(idx, { ...item, inhouseProductName: name, inhouseProductCode: code });
              if (code) onProductPicked(idx, code);
            }}
          />
        </div>
      </div>

      {/* ── CFU / Specs + Carrier — 2 cols ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <label className={label}>CFU / Specs</label>
          <input
            value={item.activeSpecs || ""}
            onChange={(e) => set("activeSpecs", e.target.value)}
            className={field}
            placeholder="e.g. 2×10^9 CFU/g"
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label className={label}>Carrier</label>
          <select value={item.carrier || ""} onChange={(e) => set("carrier", e.target.value)} className={field}>
            {CARRIER_OPTIONS.map((c) => (
              <option key={c} value={c}>{c || "— Select —"}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Qty row — 3 cols ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <label className={label}>Total Qty *</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="number"
              value={item.totalQty}
              onChange={(e) => {
                const newQty = e.target.value;
                const newCS = calcTotalCS(newQty, item.unitQty, item.unitsPerCS);
                onChange(idx, { ...item, totalQty: newQty, ...(newCS ? { totalCS: newCS } : {}) });
              }}
              className={field}
              style={{ flex: "1 1 0", minWidth: 0 }}
              placeholder="0"
              min="0"
            />
            <select
              value={item.totalUom || "KG"}
              onChange={(e) => set("totalUom", e.target.value)}
              className={field}
              style={{ flexShrink: 0, width: "68px", padding: "8px 4px" }}
            >
              {UOMS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <label className={label}>Unit Qty (per pack)</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="number"
              value={item.unitQty || ""}
              onChange={(e) => set("unitQty", e.target.value)}
              className={field}
              style={{ flex: "1 1 0", minWidth: 0 }}
              placeholder="e.g. 1"
              min="0"
            />
            <select
              value={item.unitUom || "KG"}
              onChange={(e) => set("unitUom", e.target.value)}
              className={field}
              style={{ flexShrink: 0, width: "68px", padding: "8px 4px" }}
            >
              {UOMS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <label className={label}>Section / MFG Unit</label>
          <select value={item.sectionName || ""} onChange={(e) => set("sectionName", e.target.value)} className={field}>
            <option value="">— Select —</option>
            {SECTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <PackingSection
        item={item} idx={idx} onChange={onChange} set={set}
        primaryMaterials={primaryMaterials} secondaryMaterials={secondaryMaterials}
      />

      <LabelDetailsSection item={item} set={set} />
    </div>
  );
}
