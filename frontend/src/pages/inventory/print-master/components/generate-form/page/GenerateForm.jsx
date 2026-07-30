import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { packsApi, rmApi, gateApi } from "../../../../../../api/inventory.js";
import { packingMaterialApi } from "../../../../../../api/masters.js";
import { Button, IconButton } from "../../../../../../components/ui";
import { SUB_TYPES } from "../../../../../masters/packing/components/packing-constants/packingConstants.jsx";
import { todayStr, calcExpiryDate } from "../utils/expiryDate.js";
import { inp, lbl } from "../utils/formStyles.js";
import ItemLine from "../components/ItemLine.jsx";
import "./GenerateForm.css";

// Packing Material Master's own browsing UI (CategoryList/SubTypeGrid) only
// renders this fixed category → sub-type structure — a row whose subType
// doesn't match one of these is invisible there (can't be seen, edited, or
// deleted from Packing Material Master at all). Applying the same check here keeps
// this item search limited to packing materials the user can actually find
// and manage in Packing Material Master, instead of surfacing orphaned rows
// that read as "materials I never created."
function isProperlyCategorized(pm) {
  return (SUB_TYPES[pm.category] || []).some(s => s.value === pm.subType);
}

const BLANK_ITEM = {
  selectedItem: null,   // { itemCode, itemName, uom, _type: 'rm'|'pm', _pmData?: {...} }
  numberOfBags: "",
  packQty: "",
  customerBatchCode: "",
  remainingYears: "",
  remainingMonths: "",
};
const BLANK_HDR = { supplier: "", invoiceNo: "", receivedDate: todayStr() };

export default function GenerateForm({ onGenerated, prefill, onGateUsed, onUnlink }) {
  const [rmList, setRmList]           = useState([]);
  const [pmList, setPmList]           = useState([]);
  const [hdr, setHdr]                 = useState(BLANK_HDR);
  const [items, setItems]             = useState([{ ...BLANK_ITEM }]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [linkedEntry, setLinkedEntry] = useState(null);

  // Load RM list and packing materials once
  useEffect(() => {
    rmApi.list({}).then(r => setRmList(r.data || [])).catch(console.error);
    packingMaterialApi.list().then(r => setPmList((r.data || []).filter(isProperlyCategorized))).catch(console.error);
  }, []);

  // Auto-fill header from gate inward selection
  useEffect(() => {
    if (!prefill) return;
    setHdr({
      supplier:     prefill.supplierName || "",
      invoiceNo:    prefill.invoiceNo    || "",
      receivedDate: prefill.createdAt
        ? new Date(prefill.createdAt).toISOString().split("T")[0]
        : todayStr(),
    });
    setLinkedEntry(prefill);
    setError("");
  }, [prefill]);

  const addItem     = ()         => setItems(its => [...its, { ...BLANK_ITEM }]);
  const removeItem  = (i)        => setItems(its => its.filter((_, idx) => idx !== i));
  const updateItem  = (i, next)  => setItems(its => its.map((it, idx) => idx === i ? next : it));
  const updateHdr   = (field, value) => setHdr(h => ({ ...h, [field]: value }));

  const isManual = !linkedEntry;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isManual && (!hdr.supplier.trim() || !hdr.invoiceNo.trim() || !hdr.receivedDate)) {
      setError("Supplier, Invoice No. and Received Date are required — fill them in, or select a gate entry on the right");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.selectedItem) {
        setError(`Item ${i + 1}: please select a raw material or packing material`);
        return;
      }
      if (!it.numberOfBags || parseInt(it.numberOfBags) < 1) {
        setError(`Item ${i + 1}: enter a valid number of bags`);
        return;
      }
      if (!it.packQty || parseFloat(it.packQty) <= 0) {
        setError(`Item ${i + 1}: enter a valid qty per bag`);
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      // Manual entry: mint the backing Gate Inward first (company assigned
      // server-side), then proceed exactly like the linked-entry path below
      // so both routes produce identical PrintMaster/PackDetail rows.
      let gateInwardId = linkedEntry?.inwardId;
      if (isManual) {
        const giRes = await gateApi.createManualInward({
          supplier_name: hdr.supplier.trim(),
          invoice_no:    hdr.invoiceNo.trim(),
          received_date: hdr.receivedDate,
        });
        gateInwardId = giRes.data.inwardId;
      }

      const allResults = [];
      for (const it of items) {
        const res = await packsApi.generate({
          itemCode:          it.selectedItem.itemCode,
          itemName:          it.selectedItem.itemName,
          uom:               it.selectedItem.uom,
          gateInwardId,
          numberOfBags:      parseInt(it.numberOfBags),
          packQty:           parseFloat(it.packQty),
          customerBatchCode: it.customerBatchCode || undefined,
          expiryDate:        calcExpiryDate(hdr.receivedDate, it.remainingYears, it.remainingMonths) || undefined,
        });
        allResults.push(res.data);
      }
      setItems([{ ...BLANK_ITEM }]);
      setHdr(BLANK_HDR);
      try { await gateApi.updateInward(gateInwardId, { status: "approved" }) } catch { /* ignore */ }
      setLinkedEntry(null);
      const totalPacks = allResults.reduce((n, r) => n + (r?.packs?.length || 0), 0);
      onGenerated?.({ results: allResults, totalPacks });
      onGateUsed?.();
    } catch (ex) {
      setError(ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gf-wrap">
      <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
        Generate Pack Labels
      </h2>
      <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94a3b8" }}>
        Fill invoice details, add items, then generate QR labels
      </p>

      {/* Mode banner — makes it unambiguous which of the two workflows is
          currently active, and how to switch between them. */}
      {linkedEntry ? (
        <div style={{ marginBottom: "14px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "12px", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <div>
            <span style={{ fontWeight: 700 }}>📎 Using Gate Inward:</span>
            {" "}{linkedEntry.supplierName}
            {linkedEntry.invoiceNo && ` — ${linkedEntry.invoiceNo}`}
            {linkedEntry.vehicleNo && ` — Vehicle: ${linkedEntry.vehicleNo}`}
          </div>
          <IconButton icon={X} variant="ghost" size="sm" tooltip="Unlink and switch to manual entry"
            onClick={() => { setLinkedEntry(null); setHdr(BLANK_HDR); onUnlink?.(); }}
          />
        </div>
      ) : (
        <div style={{ marginBottom: "14px", padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "12px", color: "#92400e" }}>
          <span style={{ fontWeight: 700 }}>✍️ Manual Entry:</span>{" "}
          fill in Supplier, Invoice No. and Received Date below — or select a gate entry on the right to auto-fill instead.
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Invoice header — either auto-filled + locked from a selected
            Gate Inward entry, or typed directly for a manual entry. Company
            is never shown here — it's the gate entry's own company when
            linked, or assigned automatically server-side when manual. ──── */}
        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Invoice Details
          </p>
          <div className="gf-hdr-grid">
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Supplier *</label>
              <input
                value={hdr.supplier}
                onChange={e => updateHdr("supplier", e.target.value)}
                readOnly={!isManual}
                placeholder={isManual ? "Enter supplier name" : undefined}
                style={isManual ? inp : { ...inp, background: "#f8fafc", color: "#0f172a", cursor: "not-allowed" }}
                required
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Invoice No *</label>
              <input
                value={hdr.invoiceNo}
                onChange={e => updateHdr("invoiceNo", e.target.value)}
                readOnly={!isManual}
                placeholder={isManual ? "e.g. INV-2026-001" : undefined}
                style={isManual ? inp : { ...inp, background: "#f8fafc", color: "#0f172a", cursor: "not-allowed" }}
                required
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Received Date *</label>
              <input
                type="date"
                value={hdr.receivedDate}
                onChange={e => updateHdr("receivedDate", e.target.value)}
                readOnly={!isManual}
                style={isManual ? inp : { ...inp, background: "#f8fafc", color: "#0f172a", cursor: "not-allowed" }}
                required
              />
            </div>
          </div>
        </div>

        {/* ── Item lines — always available regardless of which header mode
            is active; validated in handleSubmit alongside the header. ──── */}
        <div style={{ marginBottom: "12px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Items ({items.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map((it, i) => (
              <ItemLine
                key={i}
                idx={i}
                item={it}
                rmList={rmList}
                pmList={pmList}
                receivedDate={hdr.receivedDate}
                onChange={next => updateItem(i, next)}
                onRemove={() => removeItem(i)}
                canRemove={items.length > 1}
              />
            ))}
          </div>
        </div>

        {/* + Add Item */}
        <Button variant="outline-gray" fullWidth className="border-dashed mb-3.5" onClick={addItem}>
          + Add Item
        </Button>

        {/* Submit */}
        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          {loading
            ? "Generating…"
            : `🖨️ Generate Pack IDs${items.length > 1 ? ` (${items.length} items)` : ""}`}
        </Button>
      </form>
    </div>
  );
}
