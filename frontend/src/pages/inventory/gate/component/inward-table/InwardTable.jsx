import { useState } from "react";
import Pagination from "../../../../../components/pagination/Pagination.jsx";
import { Button } from "../../../../../components/ui";
import "./InwardTable.css";
import { toTitleCase } from "../../../../../utils/textDisplay.js";

function StatusBadge({ status }) {
  return (
    <span className={`it-status it-status--${status || "pending"}`}>
      {status}
    </span>
  );
}

const COLUMNS = [
  { key: "company",  label: "Company",       defaultWidth: 150 },
  { key: "supplier", label: "Supplier Name", defaultWidth: 180 },
  { key: "invoice",  label: "Invoice No.",   defaultWidth: 130 },
  { key: "vehicle",  label: "Vehicle No.",   defaultWidth: 120 },
  { key: "date",     label: "Date & Time",   defaultWidth: 160 },
  { key: "status",   label: "Status",        defaultWidth: 100 },
];
const ACTIONS_COL_WIDTH = 160;
const MIN_COL_WIDTH = 60;

function DeleteRequestBadge() {
  return <span className="it-del-badge">Delete Requested</span>;
}

export default function InwardTable({ list, total, onRequestDelete }) {
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);
  const paginated = list.slice((page - 1) * limit, page * limit);

  const [columnWidths, setColumnWidths] = useState(() =>
    Object.fromEntries(COLUMNS.map(c => [c.key, c.defaultWidth])));

  function startResize(key) {
    return (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = columnWidths[key];
      function onMove(ev) {
        setColumnWidths(w => ({ ...w, [key]: Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX)) }));
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
  }

  if (!list.length) {
    return (
      <div className="it-empty">
        <div className="it-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg></div>
        <div className="it-empty-title">No inward entries found</div>
        <div className="it-empty-sub">Create a new inward entry to get started</div>
      </div>
    );
  }

  return (
    <div className="it-wrap">
      <div className="it-toolbar">
        <span className="it-toolbar-title">Inward Entries</span>
        <span className="it-badge">{total ?? list.length} records</span>
      </div>

      <div className="it-scroll">
        <table className="it-table">
          <thead>
            <tr className="it-thead-row">
              {COLUMNS.map((c) => (
                <th key={c.key} className="it-th" style={{ width: columnWidths[c.key] }}>
                  {c.label}
                  <div className="it-th-resize" onMouseDown={startResize(c.key)} />
                </th>
              ))}
              <th className="it-th" style={{ width: ACTIONS_COL_WIDTH }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => (
              <tr
                key={item.inward_id || item.inwardId}
                className={`it-row ${idx % 2 === 0 ? "it-row--even" : "it-row--odd"}`}
              >
                <td className="it-td it-td-text" style={{ width: columnWidths.company }}>
                  {toTitleCase(item.company_name || item.companyName) || "—"}
                </td>
                <td className="it-td it-td-supplier" style={{ width: columnWidths.supplier }}>
                  {toTitleCase(item.supplier_name || item.supplierName)}
                </td>
                <td className="it-td it-td-text" style={{ width: columnWidths.invoice }}>
                  {item.invoice_no || item.invoiceNo || "—"}
                </td>
                <td className="it-td it-td-text" style={{ width: columnWidths.vehicle }}>
                  {item.vehicle_no || item.vehicleNo || "—"}
                </td>
                <td className="it-td it-td-date" style={{ width: columnWidths.date }}>
                  {new Date(item.created_at || item.createdAt).toLocaleString(
                    "en-IN",
                  )}
                </td>
                <td className="it-td" style={{ width: columnWidths.status }}>
                  <StatusBadge status={item.status} />
                </td>
                <td className="it-td" style={{ width: ACTIONS_COL_WIDTH }}>
                  <div className="it-actions">
                    {item.request_delete ? (
                      <DeleteRequestBadge />
                    ) : (
                      <Button
                        variant="warning"
                        size="xs"
                        onClick={() => onRequestDelete(item.inward_id || item.inwardId)}
                      >
                        Request Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="it-pagination">
        <Pagination page={page} total={list.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>
    </div>
  );
}
