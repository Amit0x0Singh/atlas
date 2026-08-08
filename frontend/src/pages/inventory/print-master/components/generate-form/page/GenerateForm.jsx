import { useState, useEffect } from "react";
import { DoorOpen, X } from "lucide-react";
import { packsApi, rmApi, gateApi } from "../../../../../../api/inventory.js";
import { Button, IconButton } from "../../../../../../components/ui";
import { useGateInward, useUpdateGateInwardStatus } from "../../../../../../hooks/inventory/useGate.js";
import { todayStr, resolveExpiryDate } from "../utils/expiryDate.js";
import { inp, lbl } from "../utils/formStyles.js";
import ItemLine, { BLANK_BATCH } from "../components/ItemLine.jsx";
import "./GenerateForm.css";

import { toTitleCase } from '../../../../../../utils/textDisplay.js'
const BLANK_ITEM = () => ({
  selectedItem: null,   // { itemCode, itemName, uom }
  packQty: "",
  batches: [BLANK_BATCH()],
});
const BLANK_HDR = { supplier: "", invoiceNo: "", receivedDate: todayStr() };

export default function GenerateForm({ onGenerated, prefill, onGateUsed, onUnlink, onOpenGatePanel }) {
  const [rmList, setRmList]           = useState([]);
  const [hdr, setHdr]                 = useState(BLANK_HDR);
  const [items, setItems]             = useState([BLANK_ITEM()]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [linkedEntry, setLinkedEntry] = useState(null);
  // Bumped on every reset so ItemLine (and its nested search/lot state) is
  // remounted instead of reused — items.map(key={i}) alone keeps the same
  // key across a reset, so the old search text/lot number would otherwise
  // survive in the still-mounted component even after `items` is cleared.
  const [formVersion, setFormVersion] = useState(0);

  // Pending-entry count for the "Incoming Gate Entries" button badge —
  // polls so it stays current even when another user (e.g. Security)
  // creates a new entry in a different session; invalidated immediately
  // after this form approves one (see handleSubmit).
  const { data: pending } = useGateInward({ status: "pending", limit: 1 }, true, { refetchInterval: 30000 });
  const pendingCount = pending?.total ?? 0;
  const updateGateStatus = useUpdateGateInwardStatus();

  // Load RM list once
  useEffect(() => {
    rmApi.list({}).then(r => setRmList(r.data || [])).catch(console.error);
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

  const addItem     = ()         => setItems(its => [...its, BLANK_ITEM()]);
  const removeItem  = (i)        => setItems(its => its.filter((_, idx) => idx !== i));
  const updateItem  = (i, next)  => setItems(its => its.map((it, idx) => idx === i ? next : it));
  const updateHdr   = (field, value) => setHdr(h => ({ ...h, [field]: value }));

  const isManual = !linkedEntry;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isManual && (!hdr.supplier.trim() || !hdr.invoiceNo.trim() || !hdr.receivedDate)) {
      setError("Supplier, Invoice No. and Received Date are required — fill them in, or pick an Incoming Gate Entry");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.selectedItem) {
        setError(`Item ${i + 1}: please select a raw material`);
        return;
      }
      if (!it.packQty || parseFloat(it.packQty) <= 0) {
        setError(`Item ${i + 1}: enter a valid qty per bag`);
        return;
      }
      for (let j = 0; j < it.batches.length; j++) {
        if (!it.batches[j].numberOfBags || parseInt(it.batches[j].numberOfBags) < 1) {
          setError(`Item ${i + 1}, Batch Group ${j + 1}: enter a valid number of bags`);
          return;
        }
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
          itemCode:     it.selectedItem.itemCode,
          itemName:     it.selectedItem.itemName,
          uom:          it.selectedItem.uom,
          gateInwardId,
          packQty:      parseFloat(it.packQty),
          batches: it.batches.map(b => ({
            numberOfBags:      parseInt(b.numberOfBags),
            customerBatchCode: b.customerBatchCode || undefined,
            expiryDate:        resolveExpiryDate(hdr.receivedDate, b.expiryMode, {
              dateValue: b.expiryDateValue, months: b.remainingMonths, years: b.remainingYears,
            }) || undefined,
          })),
        });
        allResults.push(res.data);
      }

      // Snapshot summary info before the form state below is cleared.
      const totalPacks  = allResults.reduce((n, r) => n + (r?.packs?.length || 0), 0);
      const itemNames   = items.map(it => it.selectedItem.itemName);
      const lotNumbers  = allResults.map(r => r.lotNo);
      const groups      = items.map((it, idx) => ({ itemCode: it.selectedItem.itemCode, lotNo: allResults[idx]?.lotNo }));
      const invoiceNo   = hdr.invoiceNo;

      // Full reset — clears header, items/batches, the linked gate entry,
      // and remounts ItemLine (via formVersion) so no stale item search text
      // or lot number lingers for the next entry.
      setItems([BLANK_ITEM()]);
      setHdr(BLANK_HDR);
      setFormVersion(v => v + 1);
      try { await updateGateStatus.mutateAsync({ id: gateInwardId, data: { status: "approved" } }) } catch { /* ignore */ }
      setLinkedEntry(null);
      onGenerated?.({ results: allResults, totalPacks, itemNames, invoiceNo, lotNumbers, groups });
      onGateUsed?.();
    } catch (ex) {
      setError(ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gf-wrap">
      {/* Mode + Gate Entries trigger — one compact row instead of the
          permanent side panel: shows which workflow is active, and the
          button to pick (or switch) a Gate Inward entry, with a live
          pending-count badge. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
          {linkedEntry ? (
            <>
              <span style={{ color: "#15803d" }}>
                📎 {toTitleCase(linkedEntry.supplierName)}{linkedEntry.invoiceNo && ` — ${linkedEntry.invoiceNo}`}
              </span>
              <IconButton icon={X} variant="ghost" size="xs" tooltip="Unlink and switch to manual entry"
                onClick={() => { setLinkedEntry(null); setHdr(BLANK_HDR); onUnlink?.(); }}
              />
            </>
          ) : (
            <span style={{ color: "#92400e" }}>✍️ Manual Entry</span>
          )}
        </div>
        <Button variant="outline-gray" size="sm" icon={DoorOpen} onClick={onOpenGatePanel}>
          Incoming Gate Entries
          {pendingCount > 0 && (
            <span style={{
              marginLeft: "6px", padding: "1px 7px", borderRadius: "99px",
              background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: 700,
            }}>
              {pendingCount}
            </span>
          )}
        </Button>
      </div>

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
          <div className="gf-items-grid">
            {items.map((it, i) => (
              <ItemLine
                key={`${formVersion}-${i}`}
                idx={i}
                item={it}
                rmList={rmList}
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
