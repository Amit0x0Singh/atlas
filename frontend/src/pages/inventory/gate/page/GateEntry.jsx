import { useState, useEffect, useRef } from "react";
import { CheckCircle, History } from "lucide-react";
import {
  useGateInward, useGateOutward,
  useCreateGateInward, useCreateGateOutward,
  useEditGateInward, useEditGateOutward,
  useUploadGateInwardInvoiceDoc, useUploadGateOutwardInvoiceDoc,
  useRequestDeleteGateInward, useRequestDeleteGateOutward,
} from "../../../../hooks/inventory/useGate.js";
import { useAuth } from "../../../../components/auth/AuthContext.jsx";
import { Button, BackButton, PageHeader, ErrorModal, ConfirmModal, Modal } from '../../../../components/ui'
import { DoorOpen } from "lucide-react";
import GateTabs from "../component/gate-tabs/GateTabs.jsx";
import GateToolbar, { DEFAULT_GATE_SORT } from "../component/gate-filter-bar/GateToolbar.jsx";
import InwardForm from "../component/inward-form/InwardForm.jsx";
import OutwardForm from "../component/outward-form/OutwardForm.jsx";
import HistoryTable from "../component/history-table/HistoryTable.jsx";
import "./GateEntry.css";

import { toTitleCase } from '../../../../utils/textDisplay.js'
import { COMPANIES } from "../data/companies.js";
import { gateApi } from "../../../../api/inventory.js";
import { openAuthedFile } from "../../../../utils/authedFile.js";
const EMPTY_FILTERS = { search: "", type: "", invoice_no: "", status: "", company: "", from_date: "", to_date: "" };

// companyName is stored lowercase (see gate.create.middleware's
// lowercaseFields) — map it back to the display-cased option the <select>
// in InwardForm/OutwardForm actually expects.
const matchCompany = (raw) =>
  COMPANIES.find((c) => c.toLowerCase() === String(raw || "").toLowerCase()) || "";

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GateEntry() {
  const { hasAnyPermission } = useAuth();
  const canGate = hasAnyPermission(["gate.inward.view", "gate.outward.view"]);

  // Navigation: 'home' | 'history'
  const [view, setView]       = useState("home");
  const [formTab, setFormTab] = useState("inward"); // which form is active on home
  const [formKey, setFormKey] = useState(0);        // increment to reset form

  // List state — `filters` drives the controlled inputs immediately;
  // `queryFilters` drives the actual query and is debounced for the
  // free-text fields (search/invoice_no) so we don't refetch per keystroke.
  const [filters, setFilters]           = useState(EMPTY_FILTERS);
  const [queryFilters, setQueryFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort]                 = useState(DEFAULT_GATE_SORT);
  const [errModal, setErrModal]           = useState({ open: false, message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editEntry, setEditEntry]         = useState(null); // { type: 'inward'|'outward', item }
  const [successMsg, setSuccessMsg]       = useState('');

  const debounceRef = useRef(null);

  // Historical Transactions is now the only list view — it merges both
  // queries into one type-tagged list (each row keeps its own `type` so
  // actions/permissions still route correctly; see HistoryTable.jsx).
  // `type` (Inward/Outward) isn't a field either backend endpoint knows
  // about — it only exists once the two lists are merged here — so it's
  // stripped before being sent as a query param and applied client-side
  // instead, same as the sort.
  const { type: typeFilter, ...apiFilters } = queryFilters;
  const inwardQuery  = useGateInward(apiFilters, view === "history" && typeFilter !== "outward");
  const outwardQuery = useGateOutward(apiFilters, view === "history" && typeFilter !== "inward");

  const rawList = [
    ...(typeFilter === "outward" ? [] : (inwardQuery.data?.rows ?? []).map((r) => ({ ...r, type: "inward" }))),
    ...(typeFilter === "inward"  ? [] : (outwardQuery.data?.rows ?? []).map((r) => ({ ...r, type: "outward" }))),
  ];
  const total = (typeFilter === "outward" ? 0 : (inwardQuery.data?.total ?? 0))
    + (typeFilter === "inward" ? 0 : (outwardQuery.data?.total ?? 0));
  const loading = (typeFilter !== "outward" && inwardQuery.isLoading) || (typeFilter !== "inward" && outwardQuery.isLoading);
  const error   = inwardQuery.error?.message || outwardQuery.error?.message || null;

  // Sorted client-side over whatever the server returned (capped at the
  // hook's `limit: 100` — see useGate.js) — same "Sort by" popup pattern as
  // the master-data tables.
  const list = (() => {
    const dir = sort.direction === "asc" ? 1 : -1
    return [...rawList].sort((a, b) => {
      if (sort.field === "company") return dir * (toTitleCase(a.company_name || a.companyName) || "").localeCompare(toTitleCase(b.company_name || b.companyName) || "")
      if (sort.field === "status") return dir * (a.status || "").localeCompare(b.status || "")
      const ad = new Date(a.created_at || a.createdAt || 0).getTime()
      const bd = new Date(b.created_at || b.createdAt || 0).getTime()
      return dir * (ad - bd)
    })
  })()

  const createInwardMutation  = useCreateGateInward();
  const createOutwardMutation = useCreateGateOutward();
  const editInwardMutation    = useEditGateInward();
  const editOutwardMutation   = useEditGateOutward();
  const uploadInwardDocMutation = useUploadGateInwardInvoiceDoc();
  const uploadOutwardDocMutation = useUploadGateOutwardInvoiceDoc();
  const requestDeleteInward   = useRequestDeleteGateInward();
  const requestDeleteOutward  = useRequestDeleteGateOutward();

  // Reset filters each time we enter the list view
  useEffect(() => {
    if (view === "history") {
      setFilters(EMPTY_FILTERS);
      setQueryFilters(EMPTY_FILTERS);
      setSort(DEFAULT_GATE_SORT);
    }
  }, [view]);

  // Exports exactly what's currently sorted/filtered on screen — the same
  // up-to-100-row batch the table itself is drawing from (see useGate.js).
  function exportGateCsv() {
    if (!list.length) { alert("No records to export — adjust your filters."); return }
    const headers = ["Type", "Company", "Supplier / Receiver", "Invoice No.", "Vehicle No.", "Created By", "Date & Time", "Status"]
    const rows = list.map(item => [
      item.type === "inward" ? "Inward" : "Outward",
      toTitleCase(item.company_name || item.companyName) || "",
      toTitleCase(item.type === "inward" ? (item.supplier_name || item.supplierName) : (item.receiver_name || item.receiverName)) || "",
      item.invoice_no || item.invoiceNo || "",
      item.vehicle_no || item.vehicleNo || "",
      toTitleCase(item.created_by_name || item.createdByName) || "",
      new Date(item.created_at || item.createdAt).toLocaleString("en-IN"),
      item.status || "",
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    const csv = [headers.join(","), ...rows].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `gate_history_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function openHistory() {
    setView("history");
  }

  function goHome() {
    setView("home");
    setFilters(EMPTY_FILTERS);
  }

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (key === "search" || key === "invoice_no") {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setQueryFilters(next), 400);
    } else {
      setQueryFilters(next);
    }
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setQueryFilters(EMPTY_FILTERS);
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // The invoice documents (Files, from either the plain picker or the
  // camera capture) can't travel through the JSON create/update body —
  // they're stripped off here and uploaded as a separate multipart request
  // once the entry itself exists (see gateApi.uploadInwardInvoiceDoc). An
  // entry can carry several, so `invoice_document` is an array; uploading
  // always appends, so the same call is used on both create and edit.
  const submitInward = async (form) => {
    const { invoice_document, ...fields } = form;
    try {
      const res = await createInwardMutation.mutateAsync(fields);
      const entry = res.data;
      if (invoice_document?.length) {
        try {
          await uploadInwardDocMutation.mutateAsync({ id: entry.inwardId, files: invoice_document });
        } catch (docErr) {
          setErrModal({ open: true, message: `Entry created, but the invoice document(s) failed to upload: ${docErr.message}` });
        }
      }
      showSuccess(`Inward entry created${entry?.companyName ? ` for ${toTitleCase(entry.companyName)}` : ''}${entry?.supplierName ? ` · ${toTitleCase(entry.supplierName)}` : ''}${entry?.invoiceNo ? ` · ${entry.invoiceNo}` : ''}`);
      setFormKey(k => k + 1);
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  // Same reasoning as submitInward — the Files can't travel through the
  // JSON create body, so they're stripped off and uploaded separately once
  // the entry exists.
  const submitOutward = async (form) => {
    const { invoice_document, ...fields } = form;
    try {
      const res = await createOutwardMutation.mutateAsync(fields);
      const entry = res.data;
      if (invoice_document?.length) {
        try {
          await uploadOutwardDocMutation.mutateAsync({ id: entry.outwardId, files: invoice_document });
        } catch (docErr) {
          setErrModal({ open: true, message: `Entry recorded, but the invoice document(s) failed to upload: ${docErr.message}` });
        }
      }
      showSuccess(`Outward entry recorded${entry?.companyName ? ` for ${toTitleCase(entry.companyName)}` : ''}${entry?.receiverName ? ` · ${toTitleCase(entry.receiverName)}` : ''}${entry?.invoiceNo ? ` · ${entry.invoiceNo}` : ''}`);
      setFormKey(k => k + 1);
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  const handleEdit = (item, type) => setEditEntry({ type, item });

  const submitEditInward = async (form) => {
    const { invoice_document, ...fields } = form;
    const id = editEntry.item.inward_id || editEntry.item.inwardId;
    try {
      await editInwardMutation.mutateAsync({ id, data: fields });
      if (invoice_document?.length) {
        try {
          await uploadInwardDocMutation.mutateAsync({ id, files: invoice_document });
        } catch (docErr) {
          setErrModal({ open: true, message: `Entry updated, but the invoice document(s) failed to upload: ${docErr.message}` });
        }
      }
      setEditEntry(null);
      showSuccess("Inward entry updated");
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  const handleViewInvoiceDoc = (item, fileName) => {
    const id = item.inward_id || item.inwardId;
    openAuthedFile(gateApi.invoiceDocUrl(id, fileName)).catch((e) => setErrModal({ open: true, message: `Could not open the invoice document: ${e.message}` }));
  };

  const submitEditOutward = async (form) => {
    const { invoice_document, ...fields } = form;
    const id = editEntry.item.outward_id || editEntry.item.outwardId;
    try {
      await editOutwardMutation.mutateAsync({ id, data: fields });
      if (invoice_document?.length) {
        try {
          await uploadOutwardDocMutation.mutateAsync({ id, files: invoice_document });
        } catch (docErr) {
          setErrModal({ open: true, message: `Entry updated, but the invoice document(s) failed to upload: ${docErr.message}` });
        }
      }
      setEditEntry(null);
      showSuccess("Outward entry updated");
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  const handleViewOutwardInvoiceDoc = (item, fileName) => {
    const id = item.outward_id || item.outwardId;
    openAuthedFile(gateApi.outwardInvoiceDocUrl(id, fileName)).catch((e) => setErrModal({ open: true, message: `Could not open the invoice document: ${e.message}` }));
  };

  // History view's rows carry a `type` tag instead of living under a
  // type-specific table, so its "view document" action needs to route to
  // whichever of the two type-specific handlers above actually matches.
  const handleViewDocument = (item, type, fileName) =>
    type === "inward" ? handleViewInvoiceDoc(item, fileName) : handleViewOutwardInvoiceDoc(item, fileName);

  const handleRequestDelete = (id, type) => setDeleteConfirm({ id, type });

  const confirmDeleteRequest = async () => {
    const { id, type } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      if (type === "inward") await requestDeleteInward.mutateAsync(id);
      else                   await requestDeleteOutward.mutateAsync(id);
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="ge-page">

      {/* ════════════════════════════════════════════════════
          HOME — form (inward or outward)
          ════════════════════════════════════════════════════ */}
      {view === "home" && (
        <>
          <PageHeader
            icon={DoorOpen}
            title="Gate Entry"
            description="Record inward and outward material movements"
            actions={<>
              {canGate && (
                <Button variant="primary" icon={History} onClick={openHistory}>Historical Transactions</Button>
              )}
              {/* Real router back — mobile's native back gesture already
                  covers this, so it's hidden there (see .ge-back-routable) */}
              <span className="ge-back-routable"><BackButton /></span>
            </>}
          />

          <div className="ge-body">
            {/* Success banner */}
            {successMsg && (
              <div className="ge-success">
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            {/* Inward / Outward tab selector */}
            <GateTabs tab={formTab} onChange={(t) => { setFormTab(t); setFormKey(k => k + 1) }} />

            {/* Form — key forces remount (clears fields) when Cancel is clicked */}
            {formTab === "inward" && (
              <InwardForm
                key={`inward-${formKey}`}
                onSubmit={submitInward}
                onCancel={() => setFormKey(k => k + 1)}
              />
            )}
            {formTab === "outward" && (
              <OutwardForm
                key={`outward-${formKey}`}
                onSubmit={submitOutward}
                onCancel={() => setFormKey(k => k + 1)}
              />
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          HISTORICAL TRANSACTIONS — combined inward + outward
          ════════════════════════════════════════════════════ */}
      {view === "history" && (
        <>
          <PageHeader icon={History} title="Historical Transactions" description="Inward and outward gate entries together, most recent first" actions={<BackButton onClick={goHome} />} />

          <div className="ge-body">
            {successMsg && (
              <div className="ge-success">
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            <GateToolbar
              filters={filters}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              sort={sort}
              onSortChange={setSort}
              onExport={exportGateCsv}
              total={total}
            />

            {error && <div className="ge-error">{error}</div>}

            {loading
              ? <div className="ge-loading">Loading…</div>
              : <HistoryTable
                  list={list}
                  total={total}
                  onRequestDelete={handleRequestDelete}
                  onEdit={handleEdit}
                  onViewDocument={handleViewDocument}
                />
            }
          </div>
        </>
      )}

      <ErrorModal
        open={errModal.open}
        message={errModal.message}
        onClose={() => setErrModal({ open: false, message: '' })}
      />
      <ConfirmModal
        open={!!deleteConfirm}
        title="Request Delete"
        message="This record will be flagged for review. Only an admin can permanently delete it."
        acceptText="Send Request"
        onAccept={confirmDeleteRequest}
        onCancel={() => setDeleteConfirm(null)}
      />

      <Modal open={!!editEntry} onClose={() => setEditEntry(null)} size="lg">
        {editEntry?.type === "inward" && (
          <InwardForm
            key={editEntry.item.inward_id || editEntry.item.inwardId}
            mode="edit"
            embedded
            initialValues={{
              supplier_name: editEntry.item.supplier_name || editEntry.item.supplierName || "",
              invoice_no:    editEntry.item.invoice_no    || editEntry.item.invoiceNo    || "",
              vehicle_no:    editEntry.item.vehicle_no    || editEntry.item.vehicleNo    || "",
              company:       matchCompany(editEntry.item.company_name || editEntry.item.companyName),
            }}
            existingDocument={(editEntry.item.invoice_doc_file_names || editEntry.item.invoiceDocFileNames || []).map((fileName) => ({ fileName }))}
            onViewDocument={(fileName) => handleViewInvoiceDoc(editEntry.item, fileName)}
            onSubmit={submitEditInward}
            onCancel={() => setEditEntry(null)}
          />
        )}
        {editEntry?.type === "outward" && (
          <OutwardForm
            key={editEntry.item.outward_id || editEntry.item.outwardId}
            mode="edit"
            embedded
            initialValues={{
              receiver_name: editEntry.item.receiver_name || editEntry.item.receiverName || "",
              invoice_no:    editEntry.item.invoice_no    || editEntry.item.invoiceNo    || "",
              vehicle_no:    editEntry.item.vehicle_no    || editEntry.item.vehicleNo    || "",
              company:       matchCompany(editEntry.item.company_name || editEntry.item.companyName),
            }}
            existingDocument={(editEntry.item.invoice_doc_file_names || editEntry.item.invoiceDocFileNames || []).map((fileName) => ({ fileName }))}
            onViewDocument={(fileName) => handleViewOutwardInvoiceDoc(editEntry.item, fileName)}
            onSubmit={submitEditOutward}
            onCancel={() => setEditEntry(null)}
          />
        )}
      </Modal>
    </div>
  );
}
