import { useState } from "react";
import { X } from "lucide-react";
import { packsApi } from "../../../../../../api/inventory.js";
import { IconButton } from "../../../../../../components/ui";
import { inp, lbl, withError } from "../utils/formStyles.js";
import FieldError from "./FieldError.jsx";
import BatchGroupRow from "./BatchGroupRow.jsx";

import { toTitleCase } from '../../../../../../utils/textDisplay.js'
export const BLANK_BATCH = () => ({
  numberOfBags: "",
  customerBatchCode: "",
  expiryMode: "YEAR",
  expiryDateValue: "",
  remainingMonths: "",
  remainingYears: "",
});

export default function ItemLine({ idx, item, rmList, receivedDate, onChange, onRemove, canRemove, fieldErrors, clearFieldError }) {
  const [search, setSearch]     = useState(item.selectedItem?.itemName || "");
  const [showDrop, setShowDrop] = useState(false);
  const [nextLot, setNextLot]   = useState("");

  const selectedItemError = fieldErrors?.[`item.${idx}.selectedItem`];
  const packQtyError      = fieldErrors?.[`item.${idx}.packQty`];

  const filtered = rmList.filter(r =>
    !search ||
    (r.itemName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.itemCode || "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const pickItem = async (r) => {
    setSearch(r.itemName);
    setShowDrop(false);
    const sel = {
      itemCode: r.itemCode,
      itemName: r.itemName,
      uom: r.inventoryUom || "Nos",
    };
    onChange({ ...item, selectedItem: sel });
    clearFieldError?.(`item.${idx}.selectedItem`);
    setNextLot("…");
    try {
      const res = await packsApi.nextLot(r.itemCode);
      setNextLot(res.data?.lotNo || "");
    } catch { setNextLot(""); }
  };

  const clearItem = () => {
    setSearch(""); setNextLot("");
    onChange({ ...item, selectedItem: null });
  };

  const totalBags = item.batches.reduce((n, b) => n + (parseInt(b.numberOfBags) || 0), 0);
  const addBatch = () => onChange({ ...item, batches: [...item.batches, BLANK_BATCH()] });

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px", background: "#f8fafc" }}>
      {/* Item header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Item {idx + 1}
        </span>
        {canRemove && (
          <IconButton icon={X} variant="danger" size="xs" tooltip="Remove item" onClick={onRemove} />
        )}
      </div>

      {/* Top row — item search, qty per pack, and the running bag total all
          share one row so the card doesn't burn a full row per field. */}
      <div className="gf-item-top-grid" style={{ marginBottom: "10px" }}>
      <div style={{ position: "relative" }}>
        <label style={lbl}>Item *</label>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setShowDrop(true);
            if (item.selectedItem && e.target.value !== item.selectedItem.itemName) clearItem();
          }}
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 160)}
          placeholder="Search item by name or code…"
          style={withError(inp, !!selectedItemError)}
        />
        <FieldError message={selectedItemError} />

        {/* Dropdown */}
        {showDrop && filtered.length > 0 && (
          <div style={{
            position: "absolute", zIndex: 20, width: "100%",
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            marginTop: "4px", maxHeight: "240px", overflowY: "auto",
          }}>
            {filtered.map(r => (
              <button key={r.itemCode} type="button"
                onMouseDown={() => pickItem(r)}
                style={{ width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "#dbeafe", color: "#1e40af" }}>RM</span>
                  <span style={{ fontWeight: 500 }}>{toTitleCase(r.itemName)}</span>
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{r.itemCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label style={lbl}>Qty per Pack ({item.selectedItem?.uom || "KG"}) *</label>
        <input type="number" step="0.01" min="0.01"
          value={item.packQty}
          onChange={e => { onChange({ ...item, packQty: e.target.value }); clearFieldError?.(`item.${idx}.packQty`); }}
          placeholder="e.g. 25" style={withError(inp, !!packQtyError)}
        />
        <FieldError message={packQtyError} />
      </div>
      <div>
        <label style={lbl}>Total Bags</label>
        <div style={{ ...inp, background: "#f1f5f9", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center" }}>
          {totalBags}
        </div>
      </div>
      </div>

      {/* Selected item badge */}
      {item.selectedItem && (
        <div style={{
          marginBottom: "10px", padding: "9px 12px",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "7px",
        }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", fontSize: "12px", color: "#1e40af" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "#dbeafe", color: "#1e40af" }}>
              RM
            </span>
            <span style={{ fontWeight: 600 }}>{toTitleCase(item.selectedItem.itemName)}</span>
            <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{item.selectedItem.itemCode}</span>
            <span>UOM: <strong>{item.selectedItem.uom}</strong></span>
            {nextLot && <span style={{ marginLeft: "auto", fontWeight: 700 }}>Next Lot: {nextLot}</span>}
          </div>
        </div>
      )}

      {/* Batch groups — one or more bag ranges within this lot, each with
          its own bag count, optional supplier batch code, and expiry. */}
      <div>
        <label style={lbl}>Batch Groups</label>
        <div className="gf-batch-grid">
          {item.batches.map((batch, i) => (
            <BatchGroupRow
              key={i}
              idx={i}
              batch={batch}
              receivedDate={receivedDate}
              onChange={next => onChange({ ...item, batches: item.batches.map((b, bi) => bi === i ? next : b) })}
              onRemove={() => onChange({ ...item, batches: item.batches.filter((_, bi) => bi !== i) })}
              canRemove={item.batches.length > 1}
              error={fieldErrors?.[`item.${idx}.batch.${i}.numberOfBags`]}
              onClearError={() => clearFieldError?.(`item.${idx}.batch.${i}.numberOfBags`)}
            />
          ))}
        </div>
        <button type="button" onClick={addBatch}
          style={{
            width: "100%", marginTop: "8px", padding: "8px", fontSize: "12px", fontWeight: 600,
            border: "1px dashed #cbd5e1", borderRadius: "8px", background: "none", color: "#64748b", cursor: "pointer",
          }}
        >
          + Add Batch Group
        </button>
      </div>
    </div>
  );
}
