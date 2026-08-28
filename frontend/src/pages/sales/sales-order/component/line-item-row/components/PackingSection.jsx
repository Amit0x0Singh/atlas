import { calcTotalCS } from "../../../shared/utils.js";
import { usePackingItems } from "../../../../../../hooks/usePackingItems.js";
import PackingAutocomplete from "./PackingAutocomplete.jsx";

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none";
const label = "block text-xs font-semibold text-gray-500 mb-1";

export default function PackingSection({ item, idx, onChange, set }) {
  // Type-to-search fields (same contract as the Gate Inward supplier field):
  // the operator can only commit a value that exists in the Packing Item
  // master (Settings > Packing Items). Primary-type items are the only
  // suggestions in the Primary Pack field and secondary-type in Secondary
  // Pack — enforced by which query feeds each picker. Typing a non-match
  // leaves the saved value empty.
  const { data: primaryPacking = [] } = usePackingItems('PRIMARY')
  const { data: secondaryPacking = [] } = usePackingItems('SECONDARY')
  return (
    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
        Packing
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Primary pack — individual containers (bottles, pouches, jars) */}
        <div style={{ minWidth: 0 }}>
          <label className={label}>
            Primary Pack
            <span style={{ marginLeft: "4px", fontWeight: 400, color: "#94a3b8" }}>
              (bottle / pouch / jar)
            </span>
          </label>
          <PackingAutocomplete
            value={item.unitPackType || ''}
            items={primaryPacking}
            onChange={v => set('unitPackType', v)}
            placeholder="Search primary packing…"
          />
        </div>

        {/* Secondary pack — outer containers (cartons, drums, bags) */}
        <div style={{ minWidth: 0 }}>
          <label className={label}>
            Secondary Pack
            <span style={{ marginLeft: "4px", fontWeight: 400, color: "#94a3b8" }}>
              (box / drum / bag)
            </span>
          </label>
          <PackingAutocomplete
            value={item.packingType || ''}
            items={secondaryPacking}
            onChange={v => set('packingType', v)}
            placeholder="Search secondary packing…"
          />
        </div>

        {/* Units per secondary pack */}
        <div style={{ minWidth: 0 }}>
          <label className={label}>Units per Sec. Pack</label>
          <input
            type="number"
            value={item.unitsPerCS || ""}
            onChange={(e) => {
              const newUPS = e.target.value;
              const newCS = calcTotalCS(item.totalQty, item.unitQty, newUPS);
              onChange(idx, { ...item, unitsPerCS: newUPS, ...(newCS ? { totalCS: newCS } : {}) });
            }}
            className={field}
            placeholder="e.g. 10"
            min="0"
          />
        </div>

        {/* Total secondary packs */}
        <div style={{ minWidth: 0 }}>
          <label className={label}>No. of Sec. Packs</label>
          <input
            type="number"
            value={item.totalCS || ""}
            onChange={(e) => set("totalCS", e.target.value)}
            className={field}
            placeholder="Auto or enter"
            min="0"
          />
        </div>
      </div>
    </div>
  );
}
