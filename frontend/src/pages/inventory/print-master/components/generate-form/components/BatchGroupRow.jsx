import { X, Plus } from "lucide-react";
import { IconButton, Button } from "../../../../../../components/ui";
import { resolveExpiryDate, fmtDateLabel } from "../utils/expiryDate.js";
import { inp, withError } from "../utils/formStyles.js";
import FieldError from "./FieldError.jsx";

const MODES = [
  { value: "DATE",  label: "Date" },
  { value: "MONTH", label: "Month" },
  { value: "YEAR",  label: "Year" },
];

// Compact, single-row layout — placeholders double as labels (no separate
// label line above each field) so a batch group fits on one line instead of
// stacking into several, letting a long batch list stay scannable without
// burning a full card's height per group.
const field = { ...inp, minWidth: 0 };

// One bag-range within a lot — its own bag count, its own qty per bag,
// optional supplier batch code, and its own expiry calculation. Multiple of
// these under one ItemLine let a single lot span several supplier batches
// arriving at different pack sizes, e.g. bags 1-10 on Batch-A at 25kg/bag
// expiring Dec 2027, 11-18 on Batch-B at 20kg/bag expiring Jun 2028, all
// still the same lot number.
export default function BatchGroupRow({
  idx, batch, uom, receivedDate, onChange, onRemove, canRemove, onAdd, isLast,
  numberOfBagsError, packQtyError, onClearNumberOfBagsError, onClearPackQtyError,
}) {
  const expiryDate = resolveExpiryDate(receivedDate, batch.expiryMode, {
    dateValue: batch.expiryDateValue,
    months: batch.remainingMonths,
    years: batch.remainingYears,
  })

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {/* Number badge */}
        <span style={{
          flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%",
          background: "#ef4444", color: "#fff", fontSize: "12px", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {idx + 1}
        </span>

        <div style={{ flex: "1 1 110px", minWidth: 0 }}>
          <input type="number" min="1"
            value={batch.numberOfBags}
            onChange={e => { onChange({ ...batch, numberOfBags: e.target.value }); onClearNumberOfBagsError?.(); }}
            placeholder="Number of Bags *"
            aria-label="Number of Bags"
            style={withError(field, !!numberOfBagsError)}
          />
        </div>

        <div style={{ flex: "1 1 110px", minWidth: 0 }}>
          <input type="number" step="0.01" min="0.01"
            value={batch.packQty}
            onChange={e => { onChange({ ...batch, packQty: e.target.value }); onClearPackQtyError?.(); }}
            placeholder={`Qty per Pack (${(uom || "KG").toUpperCase()}) *`}
            aria-label="Qty per Pack"
            style={withError(field, !!packQtyError)}
          />
        </div>

        <div style={{ flex: "1 1 150px", minWidth: 0 }}>
          <input
            value={batch.customerBatchCode}
            onChange={e => onChange({ ...batch, customerBatchCode: e.target.value })}
            placeholder="Supplier Batch Code (optional)"
            aria-label="Supplier Batch Code"
            style={{ ...field, background: "#fafafa" }}
          />
        </div>

        <div style={{ flex: "1 1 150px", minWidth: 0, display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
          {MODES.map(m => (
            <button key={m.value} type="button"
              onClick={() => onChange({ ...batch, expiryMode: m.value })}
              style={{
                flex: 1, padding: "8px 0", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer",
                background: batch.expiryMode === m.value ? "#2563eb" : "#fff",
                color: batch.expiryMode === m.value ? "#fff" : "#6b7280",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ flex: "1 1 130px", minWidth: 0 }}>
          {batch.expiryMode === "DATE" && (
            <input type="date"
              value={batch.expiryDateValue}
              onChange={e => onChange({ ...batch, expiryDateValue: e.target.value })}
              aria-label="Expiry Date"
              style={{ ...field, background: "#fafafa" }}
            />
          )}
          {batch.expiryMode === "MONTH" && (
            <input type="number" min="1" step="1"
              value={batch.remainingMonths}
              onChange={e => onChange({ ...batch, remainingMonths: e.target.value })}
              placeholder="Remaining Months"
              aria-label="Remaining Months"
              style={{ ...field, background: "#fafafa" }}
            />
          )}
          {batch.expiryMode === "YEAR" && (
            <input type="number" min="1" step="1"
              value={batch.remainingYears}
              onChange={e => onChange({ ...batch, remainingYears: e.target.value })}
              placeholder="Remaining Years"
              aria-label="Remaining Years"
              style={{ ...field, background: "#fafafa" }}
            />
          )}
        </div>

        {/* Actions — a removable row gets an X; the last row also gets an
            inline Add so a new batch group never requires scrolling down to
            a separate full-width "+ Add" button. */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "4px" }}>
          {canRemove && (
            <IconButton icon={X} variant="danger" size="xs" tooltip="Remove batch group" onClick={onRemove} />
          )}
          {isLast && (
            <Button type="button" variant="primary" size="xs" icon={Plus} onClick={onAdd} style={{ padding: "8px 14px" }}>
              Add
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginLeft: "32px" }}>
        <FieldError message={numberOfBagsError} />
        <FieldError message={packQtyError} />
      </div>

      {expiryDate && (
        <p style={{ margin: "4px 0 0 32px", fontSize: "12px", color: "#15803d", fontWeight: 600 }}>
          → Expiry Date: {fmtDateLabel(expiryDate)}
        </p>
      )}
    </div>
  );
}
