import {
  CARRIER_OPTIONS,
  PRIMARY_PACKING,
  SECONDARY_PACKING,
  LABEL_TYPES,
  LABEL_NEEDS_DETAILS,
  UOMS,
  SECTIONS,
} from "../shared/constants.js";
import { calcTotalCS, addDays } from "../shared/utils.js";
import InhouseProductPicker from "./InhouseProductPicker.jsx";
import CustomerProductPicker from "./CustomerProductPicker.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// LineItemRow
// Renders one product line inside the CreateSalesOrder form.
// Covers: product names, specs, carrier, qty/UOM, full packing section,
// label type, and conditional batch/date/MRP fields.
//
// Props:
//   item              {object}   current line item state
//   idx               {number}   position in the items array
//   products          {array}    product master list (for InhouseProductPicker)
//   cpProfiles        {array}    customer-product profiles (for CustomerProductPicker)
//   onChange          {fn}       (idx, updatedItem) => void
//   onRemove          {fn}       (idx) => void
//   onProductPicked   {fn}       (idx, productCode) => void
//   onCpProductPicked {fn}       (idx, profile) => void
// ─────────────────────────────────────────────────────────────────────────────
export default function LineItemRow({
  item,
  idx,
  products,
  cpProfiles,
  onChange,
  onRemove,
  onProductPicked,
  onCpProductPicked,
}) {
  const set = (k, v) => onChange(idx, { ...item, [k]: v });

  const showLabelDetails = LABEL_NEEDS_DETAILS.has(item.labelType);
  const ppIsCustom =
    item.unitPackType &&
    !PRIMARY_PACKING.includes(item.unitPackType) &&
    item.unitPackType !== "";
  const spIsCustom =
    item.packingType &&
    !SECONDARY_PACKING.includes(item.packingType) &&
    item.packingType !== "";

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">
      {/* ── Row header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Line {idx + 1}
          </span>
          {item._memApplied && (
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
              Memory applied
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="text-xs text-red-400 hover:underline"
        >
          Remove
        </button>
      </div>

      {/* ── Product names ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Customer Product Name *
            {cpProfiles.length > 0 && (
              <span className="ml-1.5 text-green-600 font-normal">
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
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Inhouse Product Name *
          </label>
          <InhouseProductPicker
            value={item.inhouseProductName}
            productCode={item.inhouseProductCode}
            products={products}
            onChange={(name, code) => {
              onChange(idx, {
                ...item,
                inhouseProductName: name,
                inhouseProductCode: code,
              });
              if (code) onProductPicked(idx, code);
            }}
          />
        </div>
      </div>

      {/* ── Specs ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            CFU / Specs
          </label>
          <input
            value={item.activeSpecs || ""}
            onChange={(e) => set("activeSpecs", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="e.g. 2x10^9 CFU/g"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Carrier
          </label>
          <select
            value={item.carrier || ""}
            onChange={(e) => set("carrier", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            {CARRIER_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c || "— Select —"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Qty + Section ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Total Qty *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={item.totalQty}
              onChange={(e) => {
                const newQty = e.target.value;
                const newCS = calcTotalCS(
                  newQty,
                  item.unitQty,
                  item.unitsPerCS,
                );
                onChange(idx, {
                  ...item,
                  totalQty: newQty,
                  ...(newCS ? { totalCS: newCS } : {}),
                });
              }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="0"
              min="0"
            />
            <select
              value={item.totalUom || "KG"}
              onChange={(e) => set("totalUom", e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {UOMS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Unit Qty (per pack)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={item.unitQty || ""}
              onChange={(e) => set("unitQty", e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="e.g. 1"
              min="0"
            />
            <select
              value={item.unitUom || "KG"}
              onChange={(e) => set("unitUom", e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {UOMS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Section / MFG Unit
          </label>
          <select
            value={item.sectionName || ""}
            onChange={(e) => set("sectionName", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value="">— Select —</option>
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Packing ──────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Packing
        </p>
        <div className="grid grid-cols-4 gap-3">
          {/* Primary pack */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Primary Pack
            </label>
            <select
              value={ppIsCustom ? "__CUSTOM__" : item.unitPackType || ""}
              onChange={(e) => {
                if (e.target.value === "__CUSTOM__") set("unitPackType", "");
                else set("unitPackType", e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {PRIMARY_PACKING.map((p) => (
                <option key={p} value={p}>
                  {p === "__CUSTOM__" ? "+ Add Custom…" : p || "— Select —"}
                </option>
              ))}
            </select>
            {ppIsCustom && (
              <input
                value={item.unitPackType}
                onChange={(e) => set("unitPackType", e.target.value)}
                placeholder="Type custom…"
                className="mt-1 w-full border border-green-300 rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>

          {/* Secondary pack */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Secondary Pack
            </label>
            <select
              value={spIsCustom ? "__CUSTOM__" : item.packingType || ""}
              onChange={(e) => {
                if (e.target.value === "__CUSTOM__") set("packingType", "");
                else set("packingType", e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {SECONDARY_PACKING.map((p) => (
                <option key={p} value={p}>
                  {p === "__CUSTOM__" ? "+ Add Custom…" : p || "— Select —"}
                </option>
              ))}
            </select>
            {spIsCustom && (
              <input
                value={item.packingType}
                onChange={(e) => set("packingType", e.target.value)}
                placeholder="Type custom…"
                className="mt-1 w-full border border-green-300 rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>

          {/* Units per secondary pack */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Unit Per Sec. Pack
            </label>
            <input
              type="number"
              value={item.unitsPerCS || ""}
              onChange={(e) => {
                const newUPS = e.target.value;
                const newCS = calcTotalCS(item.totalQty, item.unitQty, newUPS);
                onChange(idx, {
                  ...item,
                  unitsPerCS: newUPS,
                  ...(newCS ? { totalCS: newCS } : {}),
                });
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="e.g. 10"
              min="0"
            />
          </div>

          {/* Total secondary packs — auto-calculated or manual override */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              No. of Sec. Packs
            </label>
            <input
              type="number"
              value={item.totalCS || ""}
              onChange={(e) => set("totalCS", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Auto or enter"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* ── Label details ────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Label Details
        </p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Label Type
            </label>
            <select
              value={item.labelType || ""}
              onChange={(e) => set("labelType", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {LABEL_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>
                  {lt.label}
                </option>
              ))}
            </select>
            {item.labelType && !LABEL_NEEDS_DETAILS.has(item.labelType) && (
              <p className="mt-1 text-xs text-gray-400">
                No print details needed
              </p>
            )}
          </div>
        </div>

        {/* Batch / MFG date / EXP date / MRP — only for CUSTOMER, COMPUTER, RETAIL */}
        {showLabelDetails && (
          <div className="mt-3 grid grid-cols-4 gap-3 bg-green-50 border border-green-100 rounded-xl p-3">
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">
                Batch No.
              </label>
              <input
                value={item.batchNo || ""}
                onChange={(e) => set("batchNo", e.target.value)}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="e.g. GAS250601"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">
                Mfg. Date
              </label>
              <input
                type="date"
                value={item.mfgDate || ""}
                onChange={(e) => {
                  set("mfgDate", e.target.value);
                  // Auto-calculate expiry if shelf life is known from memory
                  if (item._shelfLifeDays && e.target.value) {
                    set(
                      "expDate",
                      addDays(e.target.value, item._shelfLifeDays),
                    );
                  }
                }}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">
                Exp. Date
              </label>
              <input
                type="date"
                value={item.expDate || ""}
                onChange={(e) => set("expDate", e.target.value)}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">
                MRP (₹)
              </label>
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
    </div>
  );
}
