import { useState } from "react";
import { Pencil, Paperclip } from "lucide-react";
import Pagination from "../../../../../components/pagination/Pagination.jsx";
import { Button, IconButton } from "../../../../../components/ui";
import { Can } from "../../../../../components/common/Can.jsx";
import "./OutwardTable.css";
import { toTitleCase } from "../../../../../utils/textDisplay.js";

function StatusBadge({ status }) {
  return (
    <span className={`ot-status ot-status--${status || "pending"}`}>
      {status}
    </span>
  );
}

const COLUMNS = [
  { key: "company",    label: "Company",       defaultWidth: 150 },
  { key: "receiver",   label: "Receiver Name", defaultWidth: 180 },
  { key: "invoice",    label: "Invoice No.",   defaultWidth: 130 },
  { key: "vehicle",    label: "Vehicle No.",   defaultWidth: 120 },
  { key: "created_by", label: "Created By",    defaultWidth: 150 },
  { key: "date",       label: "Date & Time",   defaultWidth: 160 },
  { key: "status",     label: "Status",        defaultWidth: 100 },
];
const ACTIONS_COL_WIDTH = 200;
const MIN_COL_WIDTH = 60;

function DeleteRequestBadge() {
  return <span className="ot-del-badge">Delete Requested</span>;
}

export default function OutwardTable({ list, total, onRequestDelete, onEdit, onViewDocument }) {
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
      <div className="ot-empty">
        <div className="ot-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
        <div className="ot-empty-title">No outward entries found</div>
        <div className="ot-empty-sub">Record a new outward movement to get started</div>
      </div>
    );
  }

  return (
    <div className="ot-wrap">
      <div className="ot-toolbar">
        <span className="ot-toolbar-title">Outward Entries</span>
        <span className="ot-badge">{total ?? list.length} records</span>
      </div>

      <div className="ot-scroll">
        <table className="ot-table">
          <thead>
            <tr className="ot-thead-row">
              {COLUMNS.map((c) => (
                <th key={c.key} className="ot-th" style={{ width: columnWidths[c.key] }}>
                  {c.label}
                  <div className="ot-th-resize" onMouseDown={startResize(c.key)} />
                </th>
              ))}
              <th className="ot-th" style={{ width: ACTIONS_COL_WIDTH }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => (
              <tr
                key={item.outward_id || item.outwardId}
                className={`ot-row ${idx % 2 === 0 ? "ot-row--even" : "ot-row--odd"}`}
              >
                <td className="ot-td ot-td-text" style={{ width: columnWidths.company }}>
                  {toTitleCase(item.company_name || item.companyName) || "—"}
                </td>
                <td className="ot-td ot-td-receiver" style={{ width: columnWidths.receiver }}>
                  {toTitleCase(item.receiver_name || item.receiverName) || "—"}
                </td>
                <td className="ot-td ot-td-text" style={{ width: columnWidths.invoice }}>
                  {item.invoice_no || item.invoiceNo || "—"}
                </td>
                <td className="ot-td ot-td-text" style={{ width: columnWidths.vehicle }}>
                  {item.vehicle_no || item.vehicleNo || "—"}
                </td>
                <td className="ot-td ot-td-text" style={{ width: columnWidths.created_by }}>
                  {toTitleCase(item.created_by_name || item.createdByName) || "—"}
                </td>
                <td className="ot-td ot-td-date" style={{ width: columnWidths.date }}>
                  {new Date(item.created_at || item.createdAt).toLocaleString("en-IN")}
                </td>
                <td className="ot-td" style={{ width: columnWidths.status }}>
                  <StatusBadge status={item.status} />
                </td>
                <td className="ot-td" style={{ width: ACTIONS_COL_WIDTH }}>
                  <div className="ot-actions">
                    <Can permission="gate.outward.update">
                      <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                    </Can>
                    {(item.invoice_doc_file_name || item.invoiceDocFileName) && (
                      <IconButton icon={Paperclip} tooltip="View Invoice" onClick={() => onViewDocument(item)} />
                    )}
                    {item.request_delete ? (
                      <DeleteRequestBadge />
                    ) : (
                      <Can permission="gate.outward.delete">
                        <Button
                          variant="warning"
                          size="xs"
                          onClick={() => onRequestDelete(item.outward_id || item.outwardId)}
                        >
                          Request Delete
                        </Button>
                      </Can>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ot-pagination">
        <Pagination page={page} total={list.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>
    </div>
  );
}
