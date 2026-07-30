import { useState } from "react";
import { X } from "lucide-react";
import { packsApi } from "../../../../../../api/inventory.js";
import { IconButton } from "../../../../../../components/ui";
import { getChips } from "../../../../../masters/packing/components/packing-constants/packingConstants.jsx";
import { calcExpiryDate, fmtDateLabel } from "../utils/expiryDate.js";
import { inp, lbl } from "../utils/formStyles.js";
import PmChips from "./PmChips.jsx";

export default function ItemLine({ idx, item, rmList, pmList, receivedDate, onChange, onRemove, canRemove }) {
  const [search, setSearch]     = useState(item.selectedItem?.itemName || "");
  const [showDrop, setShowDrop] = useState(false);
  const [nextLot, setNextLot]   = useState("");

  // Combine RM and PM into one searchable list
  const combined = [
    ...rmList.map(r => ({ ...r, _type: "rm" })),
    ...pmList.map(p => ({ ...p, _type: "pm", uom: p.uom || "Nos" })),
  ];

  const filtered = combined.filter(r =>
    !search ||
    (r.itemName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.itemCode || "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const filteredRm = filtered.filter(r => r._type === "rm");
  const filteredPm = filtered.filter(r => r._type === "pm");

  const pickItem = async (r) => {
    setSearch(r.itemName);
    setShowDrop(false);
    const sel = {
      itemCode: r.itemCode,
      itemName: r.itemName,
      uom: r.uom || "Nos",
      _type: r._type,
      _pmData: r._type === "pm" ? r : undefined,
    };
    onChange({ ...item, selectedItem: sel });
    if (r._type === "rm") {
      setNextLot("…");
      try {
        const res = await packsApi.nextLot(r.itemCode);
        setNextLot(res.data?.lotNo || "");
      } catch { setNextLot(""); }
    } else {
      setNextLot("");
    }
  };

  const clearItem = () => {
    setSearch(""); setNextLot("");
    onChange({ ...item, selectedItem: null });
  };

  const isPm = item.selectedItem?._type === "pm";

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px", background: "#f8fafc" }}>
      {/* Item header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Item {idx + 1}
        </span>
        {canRemove && (
          <IconButton icon={X} variant="danger" size="xs" tooltip="Remove item" onClick={onRemove} />
        )}
      </div>

      {/* Search input */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
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
          style={inp}
        />

        {/* Dropdown */}
        {showDrop && (filteredRm.length > 0 || filteredPm.length > 0) && (
          <div style={{
            position: "absolute", zIndex: 20, width: "100%",
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            marginTop: "4px", maxHeight: "240px", overflowY: "auto",
          }}>
            {/* RM section */}
            {filteredRm.length > 0 && (
              <>
                <div style={{ padding: "5px 12px 3px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                  Raw Materials
                </div>
                {filteredRm.map(r => (
                  <button key={r.itemCode} type="button"
                    onMouseDown={() => pickItem(r)}
                    style={{ width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "#dbeafe", color: "#1e40af" }}>RM</span>
                      <span style={{ fontWeight: 500 }}>{r.itemName}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{r.itemCode}</span>
                  </button>
                ))}
              </>
            )}

            {/* PM section */}
            {filteredPm.length > 0 && (
              <>
                <div style={{ padding: "5px 12px 3px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", borderTop: filteredRm.length > 0 ? "1px solid #e2e8f0" : "none", background: "#f8fafc" }}>
                  Packing Materials
                </div>
                {filteredPm.map(p => {
                  const chips = getChips(p);
                  return (
                    <button key={p.itemCode} type="button"
                      onMouseDown={() => pickItem(p)}
                      style={{ width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "#dcfce7", color: "#166534" }}>PM</span>
                          <span style={{ fontWeight: 500 }}>{p.itemName}</span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace", flexShrink: 0, marginLeft: "8px" }}>{p.itemCode}</span>
                      </div>
                      {chips.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "3px", paddingLeft: "28px" }}>
                          {chips.slice(0, 4).map((chip, i) => (
                            <span key={i} style={{ fontSize: "10px", color: "#6b7280", padding: "0px 5px", borderRadius: "8px", background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected item badge */}
      {item.selectedItem && (
        <div style={{
          marginBottom: "10px", padding: "9px 12px",
          background: isPm ? "#f0fdf4" : "#eff6ff",
          border: isPm ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
          borderRadius: "7px",
        }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", fontSize: "12px", color: isPm ? "#15803d" : "#1e40af" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: isPm ? "#dcfce7" : "#dbeafe", color: isPm ? "#166534" : "#1e40af" }}>
              {isPm ? "PM" : "RM"}
            </span>
            <span style={{ fontWeight: 600 }}>{item.selectedItem.itemName}</span>
            <span style={{ fontFamily: "monospace", color: isPm ? "#16a34a" : "#3b82f6" }}>{item.selectedItem.itemCode}</span>
            <span>UOM: <strong>{item.selectedItem.uom}</strong></span>
            {nextLot && <span style={{ marginLeft: "auto", fontWeight: 700 }}>Next Lot: {nextLot}</span>}
          </div>
          {isPm && item.selectedItem._pmData && (
            <PmChips pmData={item.selectedItem._pmData} />
          )}
        </div>
      )}

      {/* Qty fields */}
      <div className="gf-qty-grid" style={{ marginBottom: "10px" }}>
        <div>
          <label style={lbl}>Number of packs *</label>
          <input type="number" min="1"
            value={item.numberOfBags}
            onChange={e => onChange({ ...item, numberOfBags: e.target.value })}
            placeholder="e.g. 20" style={inp}
          />
        </div>
        <div>
          <label style={lbl}>Qty per Pack ({item.selectedItem?.uom || "KG"}) *</label>
          <input type="number" step="0.01" min="0.01"
            value={item.packQty}
            onChange={e => onChange({ ...item, packQty: e.target.value })}
            placeholder="e.g. 25" style={inp}
          />
        </div>
      </div>

      {/* Customer batch code (optional) */}
      <div>
        <label style={{ ...lbl, color: "#6b7280" }}>
          Supplier Batch Code
          <span style={{ fontWeight: 400, fontSize: "11px", marginLeft: "4px", color: "#9ca3af" }}>(optional)</span>
        </label>
        <input
          value={item.customerBatchCode}
          onChange={e => onChange({ ...item, customerBatchCode: e.target.value })}
          placeholder="e.g. BATCH-2026-001"
          style={{ ...inp, background: "#fafafa" }}
        />
      </div>

      {/* Shelf life remaining — only for Raw Materials. Most RMs are labelled
          with a total shelf life from their manufacturing date rather than a
          printed expiry date, so the operator enters however much of that
          shelf life is left (years + months) and the expiry date is derived
          from the received date automatically instead of being hand-calculated. */}
      {!isPm && (() => {
        const expiryDate = calcExpiryDate(receivedDate, item.remainingYears, item.remainingMonths);
        return (
          <div style={{ marginTop: "10px" }}>
            <label style={{ ...lbl, color: "#6b7280" }}>
              Shelf Life Remaining
              <span style={{ fontWeight: 400, fontSize: "11px", marginLeft: "4px", color: "#9ca3af" }}>(optional)</span>
            </label>
            <div className="gf-qty-grid">
              <div>
                <input type="number" min="0" step="1"
                  value={item.remainingYears}
                  onChange={e => onChange({ ...item, remainingYears: e.target.value })}
                  placeholder="Years" style={{ ...inp, background: "#fafafa" }}
                />
              </div>
              <div>
                <input type="number" min="0" max="11" step="1"
                  value={item.remainingMonths}
                  onChange={e => onChange({ ...item, remainingMonths: e.target.value })}
                  placeholder="Months" style={{ ...inp, background: "#fafafa" }}
                />
              </div>
            </div>
            {expiryDate && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#15803d", fontWeight: 600 }}>
                → Expiry Date: {fmtDateLabel(expiryDate)}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
