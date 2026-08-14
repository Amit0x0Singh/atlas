import { useState, useEffect } from "react";
import { RefreshCw, Search, X, DoorOpen } from "lucide-react";
import { useGateInward } from "../../../../../hooks/inventory/useGate.js";
import { useDebouncedValue } from "../../../../../hooks/useDebouncedValue.js";
import { IconButton } from "../../../../../components/ui";
import Pagination from "../../../../../components/pagination/Pagination.jsx";

import { toTitleCase } from '../../../../../utils/textDisplay.js'
const STATUS_COLORS = {
  pending:  { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#f0fdf4", color: "#15803d" },
  rejected: { bg: "#fef2f2", color: "#dc2626" },
};

const LIMIT = 10;

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      padding: "2px 8px", background: s.bg, color: s.color,
      borderRadius: "99px", fontSize: "10px", fontWeight: 700,
      textTransform: "capitalize", flexShrink: 0,
    }}>
      {status}
    </span>
  );
}

// Modal content — the picker for linking a Gate Inward entry to the
// Generate Pack Labels form. Selecting a row hands it to the parent (which
// fills the form and closes this modal); this component only owns search
// and pagination over the live "pending" list.
export default function GateInwardPanel({ onSelect, selectedId, onClose }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data, isLoading, isFetching, error, refetch } = useGateInward({
    status: "pending",
    search: debouncedSearch,
    limit: LIMIT,
    offset: (page - 1) * LIMIT,
  }, true);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "80vh", maxHeight: "80vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <DoorOpen size={17} />
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>Incoming Gate Entries</h2>
            <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8" }}>{total} pending</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <IconButton icon={RefreshCw} tooltip="Refresh" onClick={() => refetch()} className={isFetching ? "animate-spin" : ""} />
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "14px 20px 0", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search supplier or invoice no…"
            autoFocus
            style={{
              width: "100%", padding: "9px 10px 9px 32px", fontSize: "13px",
              border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px", minHeight: "200px" }}>
        {error ? (
          <div style={{ color: "#dc2626", fontSize: "12px", padding: "8px 12px", background: "#fef2f2", borderRadius: "6px" }}>
            {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: "13px" }}>
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🚪</div>
            <p style={{ fontSize: "13px", fontWeight: 600 }}>
              {search ? `No matches for "${search}"` : "No pending gate entries"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rows.map((r) => {
              const isSelected = selectedId === r.inwardId;
              return (
                <button
                  key={r.inwardId}
                  type="button"
                  onClick={() => onSelect(r)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "12px 14px",
                    background: isSelected ? "#eff6ff" : "#f8fafc",
                    border: `1.5px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`,
                    borderRadius: "9px", cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#93c5fd"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#e2e8f0"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>{toTitleCase(r.supplierName)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11px", color: "#64748b" }}>
                    {r.invoiceNo && <span>📄 {r.invoiceNo}</span>}
                    {r.vehicleNo && <span>🚛 {r.vehicleNo}</span>}
                    <span style={{ marginLeft: "auto" }}>{fmtDate(r.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ padding: "10px 20px 16px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
