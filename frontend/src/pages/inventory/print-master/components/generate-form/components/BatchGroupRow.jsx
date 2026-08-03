import { X } from "lucide-react";
import { IconButton } from "../../../../../../components/ui";
import { resolveExpiryDate, fmtDateLabel } from "../utils/expiryDate.js";
import { inp, lbl } from "../utils/formStyles.js";

const MODES = [
  { value: "DATE",  label: "Date" },
  { value: "MONTH", label: "Month" },
  { value: "YEAR",  label: "Year" },
];

// One bag-range within a lot — its own bag count, optional supplier batch
// code, and (for raw materials) its own expiry calculation. Multiple of
// these under one ItemLine let a single lot span several supplier batches,
// e.g. bags 1-10 on Batch-A expiring Dec 2027, 11-18 on Batch-B expiring
// Jun 2028, all still the same lot number.
export default function BatchGroupRow({ idx, batch, receivedDate, isPm, onChange, onRemove, canRemove }) {
  const expiryDate = !isPm
    ? resolveExpiryDate(receivedDate, batch.expiryMode, {
        dateValue: batch.expiryDateValue,
        months: batch.remainingMonths,
        years: batch.remainingYears,
      })
    : "";

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Batch Group {idx + 1}
        </span>
        {canRemove && (
          <IconButton icon={X} variant="danger" size="xs" tooltip="Remove batch group" onClick={onRemove} />
        )}
      </div>

      <div className={`gf-batch-row ${isPm ? "gf-batch-row-2" : ""}`}>
        <div>
          <label style={lbl}>Number of Bags *</label>
          <input type="number" min="1"
            value={batch.numberOfBags}
            onChange={e => onChange({ ...batch, numberOfBags: e.target.value })}
            placeholder="e.g. 10" style={inp}
          />
        </div>
        <div>
          <label style={{ ...lbl, color: "#6b7280" }}>
            Supplier Batch Code <span style={{ fontWeight: 400, fontSize: "11px", color: "#9ca3af" }}>(optional)</span>
          </label>
          <input
            value={batch.customerBatchCode}
            onChange={e => onChange({ ...batch, customerBatchCode: e.target.value })}
            placeholder="e.g. BATCH-A"
            style={{ ...inp, background: "#fafafa" }}
          />
        </div>

        {!isPm && (
          <>
            <div>
              <label style={{ ...lbl, color: "#6b7280" }}>Expiry Calculation Type</label>
              <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden" }}>
                {MODES.map(m => (
                  <button key={m.value} type="button"
                    onClick={() => onChange({ ...batch, expiryMode: m.value })}
                    style={{
                      flex: 1, padding: "6px 0", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer",
                      background: batch.expiryMode === m.value ? "#2563eb" : "#fff",
                      color: batch.expiryMode === m.value ? "#fff" : "#6b7280",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {batch.expiryMode === "DATE" && (
                <>
                  <label style={{ ...lbl, color: "#6b7280" }}>Date</label>
                  <input type="date"
                    value={batch.expiryDateValue}
                    onChange={e => onChange({ ...batch, expiryDateValue: e.target.value })}
                    style={{ ...inp, background: "#fafafa" }}
                  />
                </>
              )}
              {batch.expiryMode === "MONTH" && (
                <>
                  <label style={{ ...lbl, color: "#6b7280" }}>Remaining Months</label>
                  <input type="number" min="1" step="1"
                    value={batch.remainingMonths}
                    onChange={e => onChange({ ...batch, remainingMonths: e.target.value })}
                    placeholder="e.g. 18" style={{ ...inp, background: "#fafafa" }}
                  />
                </>
              )}
              {batch.expiryMode === "YEAR" && (
                <>
                  <label style={{ ...lbl, color: "#6b7280" }}>Remaining Years</label>
                  <input type="number" min="1" step="1"
                    value={batch.remainingYears}
                    onChange={e => onChange({ ...batch, remainingYears: e.target.value })}
                    placeholder="e.g. 2" style={{ ...inp, background: "#fafafa" }}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {expiryDate && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#15803d", fontWeight: 600 }}>
          → Expiry Date: {fmtDateLabel(expiryDate)}
        </p>
      )}
    </div>
  );
}
