import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DoorOpen, X } from "lucide-react";
import { packsApi, rmApi, gateApi } from "../../../../../../api/inventory.js";
import { Button, IconButton } from "../../../../../../components/ui";
import { Can } from "../../../../../../components/common/Can.jsx";
import { useGateInward } from "../../../../../../hooks/inventory/useGate.js";
import { todayStr, resolveExpiryDate } from "../utils/expiryDate.js";
import { inp, lbl, withError } from "../utils/formStyles.js";
import ItemLine, { BLANK_BATCH } from "../components/ItemLine.jsx";
import FieldError from "../components/FieldError.jsx";
import "./GenerateForm.css";

import { toTitleCase } from '../../../../../../utils/textDisplay.js'
const BLANK_ITEM = () => ({
  selectedItem: null,   // { itemCode, itemName, uom }
  batches: [BLANK_BATCH()],
});
const BLANK_HDR = { supplier: "", invoiceNo: "", receivedDate: todayStr() };

export default function GenerateForm({ onGenerated, prefill, onGateUsed, onUnlink, onOpenGatePanel }) {
  const [rmList, setRmList]           = useState([]);
  const [hdr, setHdr]                 = useState(BLANK_HDR);
  const [items, setItems]             = useState([BLANK_ITEM()]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  // Field-level validation errors, keyed by a flat string identifying the
  // exact input (e.g. "hdr.supplier", "item.0.packQty",
  // "item.0.batch.1.numberOfBags") — rendered below that specific input,
  // separately from the general/API `error` banner above.
  const [fieldErrors, setFieldErrors] = useState({});
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
  const qc = useQueryClient();

  // Load RM list once
  useEffect(() => {
    rmApi.search({}).then(r => setRmList(r.data || [])).catch(console.error);
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
    setFieldErrors({});
  }, [prefill]);

  const addItem     = ()         => setItems(its => [...its, BLANK_ITEM()]);
  const removeItem  = (i)        => { setItems(its => its.filter((_, idx) => idx !== i)); setFieldErrors({}); };
  const updateItem  = (i, next)  => {
    // Batch add/remove shifts every later batch's index, which would leave
    // stale field errors pointing at the wrong batch — safest to drop all
    // field errors whenever an item's batch count changes.
    if (items[i] && next.batches.length !== items[i].batches.length) setFieldErrors({});
    setItems(its => its.map((it, idx) => idx === i ? next : it));
  };
  const updateHdr   = (field, value) => {
    setHdr(h => ({ ...h, [field]: value }));
    clearFieldError(`hdr.${field}`);
  };

  const clearFieldError = (key) => {
    setFieldErrors(fe => {
      if (!(key in fe)) return fe;
      const { [key]: _omit, ...rest } = fe;
      return rest;
    });
  };

  const isManual = !linkedEntry;

  const validate = () => {
    const errs = {};
    if (isManual) {
      if (!hdr.supplier.trim())  errs["hdr.supplier"]     = "Supplier is required";
      if (!hdr.invoiceNo.trim()) errs["hdr.invoiceNo"]    = "Invoice No is required";
      if (!hdr.receivedDate)     errs["hdr.receivedDate"] = "Received date is required";
    }
    items.forEach((it, i) => {
      if (!it.selectedItem) {
        errs[`item.${i}.selectedItem`] = "Please select a raw material";
      }
      it.batches.forEach((b, j) => {
        if (!b.numberOfBags || parseInt(b.numberOfBags, 10) < 1) {
          errs[`item.${i}.batch.${j}.numberOfBags`] = "Enter a valid number of bags";
        }
        if (!b.packQty || parseFloat(b.packQty) <= 0) {
          errs[`item.${i}.batch.${j}.packQty`] = "Enter a valid qty per bag";
        }
      });
    });
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
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
          batches: it.batches.map(b => ({
            numberOfBags:      parseInt(b.numberOfBags),
            packQty:           parseFloat(b.packQty),
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
      setFieldErrors({});
      setFormVersion(v => v + 1);
      // The backend flips this Gate Inward to "approved" as part of
      // /packs/generate — just refresh the pending-count badge and any open
      // gate picker list so they reflect it right away.
      qc.invalidateQueries({ queryKey: ["gate-inward"] });
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
                style={withError(isManual ? inp : { ...inp, background: "#f8fafc", color: "#0f172a", cursor: "not-allowed" }, !!fieldErrors["hdr.supplier"])}
                required
              />
              <FieldError message={fieldErrors["hdr.supplier"]} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Invoice No *</label>
              <input
                value={hdr.invoiceNo}
                onChange={e => updateHdr("invoiceNo", e.target.value)}
                readOnly={!isManual}
                placeholder={isManual ? "e.g. INV-2026-001" : undefined}
                style={withError(isManual ? inp : { ...inp, background: "#f8fafc", color: "#0f172a", cursor: "not-allowed" }, !!fieldErrors["hdr.invoiceNo"])}
                required
              />
              <FieldError message={fieldErrors["hdr.invoiceNo"]} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={lbl}>Received Date *</label>
              <input
                type="date"
                value={hdr.receivedDate}
                onChange={e => updateHdr("receivedDate", e.target.value)}
                readOnly={!isManual}
                style={withError(isManual ? inp : { ...inp, background: "#f8fafc", color: "#0f172a", cursor: "not-allowed" }, !!fieldErrors["hdr.receivedDate"])}
                required
              />
              <FieldError message={fieldErrors["hdr.receivedDate"]} />
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
                // Raw materials already picked in *other* item lines — kept
                // out of this line's own dropdown so the same material can't
                // end up selected twice across the form.
                selectedElsewhere={new Set(
                  items.filter((_, oi) => oi !== i).map(o => o.selectedItem?.itemCode).filter(Boolean)
                )}
                receivedDate={hdr.receivedDate}
                onChange={next => updateItem(i, next)}
                onRemove={() => removeItem(i)}
                canRemove={items.length > 1}
                fieldErrors={fieldErrors}
                clearFieldError={clearFieldError}
              />
            ))}
          </div>
        </div>

        {/* + Add Item */}
        <Can permission="inventory.inward.create">
          <Button variant="outline-gray" fullWidth className="border-dashed mb-3.5" onClick={addItem}>
            + Add Item
          </Button>
        </Can>

        {/* Submit */}
        <Can permission="inventory.inward.create">
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {loading
              ? "Generating…"
              : `🖨️ Generate Pack IDs${items.length > 1 ? ` (${items.length} items)` : ""}`}
          </Button>
        </Can>
      </form>
    </div>
  );
}
