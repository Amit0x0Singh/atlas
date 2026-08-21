import { useEffect, useState } from "react";
import { Pencil, Paperclip, ArrowDown, ArrowUp, Eye } from "lucide-react";
import Pagination from "../../../../../components/pagination/Pagination.jsx";
import { Button, IconButton, Modal } from "../../../../../components/ui";
import { Can } from "../../../../../components/common/Can.jsx";
import "./HistoryTable.css";
import { toTitleCase } from "../../../../../utils/textDisplay.js";
import { Trash2 } from "lucide-react";

function StatusBadge({ status }) {
  return (
    <span className={`ht-status ht-status--${status || "pending"}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }) {
  const isInward = type === "inward";
  const Icon = isInward ? ArrowDown : ArrowUp;
  return (
    <span className={`ht-type ht-type--${type}`}>
      <Icon size={11} strokeWidth={2.5} />
      {isInward ? "Inward" : "Outward"}
    </span>
  );
}

const COLUMNS = [
  { key: "type",       label: "Type",               defaultWidth: 110 },
  { key: "company",    label: "Company",             defaultWidth: 140 },
  { key: "party",      label: "Supplier / Receiver", defaultWidth: 180 },
  { key: "invoice",    label: "Invoice No.",         defaultWidth: 130 },
  { key: "vehicle",    label: "Vehicle No.",         defaultWidth: 120 },
  { key: "created_by", label: "Created By",          defaultWidth: 150 },
  { key: "date",       label: "Date & Time",         defaultWidth: 160 },
  { key: "status",     label: "Status",              defaultWidth: 100 },
];
const ACTIONS_COL_WIDTH = 200;
const MIN_COL_WIDTH = 60;

function DeleteRequestBadge() {
  return <span className="ht-del-badge">Delete Requested</span>;
}

// Combined chronological view of Gate Inward + Gate Outward entries — each
// row carries a `type: 'inward'|'outward'` tag (added by GateEntry.jsx when
// it merges the two queries) that drives the Type badge, which field holds
// the counterparty name (supplier vs receiver), and which permission/
// handler each action routes to.
export default function HistoryTable({ list, total, filterKey, onRequestDelete, onEdit, onViewDocument }) {
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);
  // Reset to page 1 whenever the applied filters change (not on every
  // render — `list` itself is re-sorted into a new array each render, so
  // depending on it directly would bounce the user back to page 1 while
  // paging through results).
  useEffect(() => { setPage(1); }, [filterKey]);
  const paginated = list.slice((page - 1) * limit, page * limit);
  // An entry can carry several documents now — a single click can't target
  // "the" document anymore, so more than one opens a small picker instead
  // of going straight to openAuthedFile.
  const [docsPicker, setDocsPicker] = useState(null); // { item, type, docs }

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
      <div className="ht-empty">
        <div className="ht-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg></div>
        <div className="ht-empty-title">No transactions found</div>
        <div className="ht-empty-sub">Inward and outward gate entries will appear here together</div>
      </div>
    );
  }

  return (
    <div className="ht-wrap">
      <div className="ht-toolbar">
        <span className="ht-toolbar-title">Historical Transactions</span>
        <span className="ht-badge">{total ?? list.length} records</span>
      </div>

      <div className="ht-scroll">
        <table className="ht-table">
          <thead>
            <tr className="ht-thead-row">
              {COLUMNS.map((c) => (
                <th key={c.key} className="ht-th" style={{ width: columnWidths[c.key] }}>
                  {c.label}
                  <div className="ht-th-resize" onMouseDown={startResize(c.key)} />
                </th>
              ))}
              <th className="ht-th" style={{ width: ACTIONS_COL_WIDTH }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => {
              const isInward = item.type === "inward";
              const id = isInward
                ? (item.inward_id || item.inwardId)
                : (item.outward_id || item.outwardId);
              const party = isInward
                ? (item.supplier_name || item.supplierName)
                : (item.receiver_name || item.receiverName);
              const docs = item.invoice_doc_file_names || item.invoiceDocFileNames || [];
              const updatePerm = `gate.${item.type}.update`;
              const deletePerm = `gate.${item.type}.delete`;

              return (
                <tr
                  key={`${item.type}-${id}`}
                  className={`ht-row ${idx % 2 === 0 ? "ht-row--even" : "ht-row--odd"}`}
                >
                  <td className="ht-td" style={{ width: columnWidths.type }}>
                    <TypeBadge type={item.type} />
                  </td>
                  <td className="ht-td ht-td-text" style={{ width: columnWidths.company }}>
                    {toTitleCase(item.company_name || item.companyName) || "—"}
                  </td>
                  <td className="ht-td ht-td-party" style={{ width: columnWidths.party }}>
                    {toTitleCase(party) || "—"}
                  </td>
                  <td className="ht-td ht-td-text" style={{ width: columnWidths.invoice }}>
                    {item.invoice_no || item.invoiceNo || "—"}
                  </td>
                  <td className="ht-td ht-td-text" style={{ width: columnWidths.vehicle }}>
                    {item.vehicle_no || item.vehicleNo || "—"}
                  </td>
                  <td className="ht-td ht-td-text" style={{ width: columnWidths.created_by }}>
                    {toTitleCase(item.created_by_name || item.createdByName) || "—"}
                  </td>
                  <td className="ht-td ht-td-date" style={{ width: columnWidths.date }}>
                    {new Date(item.created_at || item.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="ht-td" style={{ width: columnWidths.status }}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="ht-td" style={{ width: ACTIONS_COL_WIDTH }}>
                    <div className="ht-actions">
                      <Can permission={updatePerm}>
                        <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item, item.type)} />
                      </Can>
                      {docs.length === 1 && (
                        <IconButton icon={Paperclip} tooltip="View Invoice" onClick={() => onViewDocument(item, item.type, docs[0])} />
                      )}
                      {docs.length > 1 && (
                        <button
                          type="button"
                          className="ht-docs-btn"
                          title={`${docs.length} invoice documents`}
                          onClick={() => setDocsPicker({ item, type: item.type, docs })}
                        >
                          <Paperclip size={13} /> {docs.length}
                        </button>
                      )}
                      {item.request_delete ? (
                        <DeleteRequestBadge />
                      ) : (
                        <Can permission={deletePerm}>
                          <Button
                            title="Request Delete"  
                              style={{
                                padding: "4px 9px",
                                background: "#ffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",    
                              }}
                            onClick={() => onRequestDelete(id, item.type)}
                          > 
                              <Trash2 size={15} color="#475569" />
                          </Button>
                        </Can>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ht-pagination">
        <Pagination page={page} total={list.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>

      <Modal open={!!docsPicker} onClose={() => setDocsPicker(null)} size="sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Paperclip size={15} />
          </span>
          <h2 className="text-base font-bold text-gray-900">Invoice Documents ({docsPicker?.docs.length ?? 0})</h2>
        </div>
        <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {docsPicker?.docs.map((fileName) => (
            <button
              key={fileName}
              type="button"
              className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition text-sm text-gray-700"
              onClick={() => onViewDocument(docsPicker.item, docsPicker.type, fileName)}
            >
              <Eye size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{fileName}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end px-5 py-4 border-t border-gray-100 bg-gray-50/60">
          <Button variant="secondary" onClick={() => setDocsPicker(null)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
