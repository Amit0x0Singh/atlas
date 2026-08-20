import { useState, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, CheckCircle } from "lucide-react";
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
import InwardTable from "../component/inward-table/InwardTable.jsx";
import OutwardTable from "../component/outward-table/OutwardTable.jsx";
import "./GateEntry.css";

import { toTitleCase } from '../../../../utils/textDisplay.js'
import { COMPANIES } from "../data/companies.js";
import { gateApi } from "../../../../api/inventory.js";
import { openAuthedFile } from "../../../../utils/authedFile.js";
const EMPTY_FILTERS = { search: "", invoice_no: "", status: "", company: "", from_date: "", to_date: "" };

// companyName is stored lowercase (see gate.create.middleware's
// lowercaseFields) — map it back to the display-cased option the <select>
// in InwardForm/OutwardForm actually expects.
const matchCompany = (raw) =>
  COMPANIES.find((c) => c.toLowerCase() === String(raw || "").toLowerCase()) || "";

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GateEntry() {
  const { hasAnyPermission } = useAuth();
  const canGate = hasAnyPermission(["gate.inward.view", "gate.outward.view"]);

  // Navigation: 'home' | 'inward-list' | 'outward-list'
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

  const listType = view === "inward-list" ? "inward" : "outward";

  const inwardQuery  = useGateInward(queryFilters, view === "inward-list");
  const outwardQuery = useGateOutward(queryFilters, view === "outward-list");
  const activeQuery  = listType === "inward" ? inwardQuery : outwardQuery;
  const rawList = activeQuery.data?.rows ?? [];
  const total   = activeQuery.data?.total ?? 0;
  const loading = activeQuery.isLoading;
  const error   = activeQuery.error?.message ?? null;

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

  // Reset filters each time we enter a list view
  useEffect(() => {
    if (view === "inward-list" || view === "outward-list") {
      setFilters(EMPTY_FILTERS);
      setQueryFilters(EMPTY_FILTERS);
      setSort(DEFAULT_GATE_SORT);
    }
  }, [view]);

  // Exports exactly what's currently sorted/filtered on screen — the same
  // up-to-100-row batch the table itself is drawing from (see useGate.js).
  function exportGateCsv() {
    if (!list.length) { alert("No records to export — adjust your filters."); return }
    const isInward = listType === "inward"
    const headers = ["Company", isInward ? "Supplier Name" : "Receiver Name", "Invoice No.", "Vehicle No.", "Created By", "Date & Time", "Status"]
    const rows = list.map(item => [
      toTitleCase(item.company_name || item.companyName) || "",
      toTitleCase(isInward ? (item.supplier_name || item.supplierName) : (item.receiver_name || item.receiverName)) || "",
      item.invoice_no || item.invoiceNo || "",
      item.vehicle_no || item.vehicleNo || "",
      toTitleCase(item.created_by_name || item.createdByName) || "",
      new Date(item.created_at || item.createdAt).toLocaleString("en-IN"),
      item.status || "",
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    const csv = [headers.join(","), ...rows].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `gate_${listType}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function openList(type) {
    setView(type === "inward" ? "inward-list" : "outward-list");
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

  // The invoice document (a File, from either the plain picker or the
  // camera capture) can't travel through the JSON create/update body — it's
  // stripped off here and uploaded as a separate multipart request once the
  // entry itself exists (see gateApi.uploadInwardInvoiceDoc).
  const submitInward = async (form) => {
    const { invoice_document, ...fields } = form;
    try {
      const res = await createInwardMutation.mutateAsync(fields);
      const entry = res.data;
      if (invoice_document) {
        try {
          await uploadInwardDocMutation.mutateAsync({ id: entry.inwardId, file: invoice_document });
        } catch (docErr) {
          setErrModal({ open: true, message: `Entry created, but the invoice document failed to upload: ${docErr.message}` });
        }
      }
      showSuccess(`Inward entry created${entry?.companyName ? ` for ${toTitleCase(entry.companyName)}` : ''}${entry?.supplierName ? ` · ${toTitleCase(entry.supplierName)}` : ''}${entry?.invoiceNo ? ` · ${entry.invoiceNo}` : ''}`);
      setFormKey(k => k + 1);
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  // Same reasoning as submitInward — the File can't travel through the JSON
  // create body, so it's stripped off and uploaded separately once the
  // entry exists.
  const submitOutward = async (form) => {
    const { invoice_document, ...fields } = form;
    try {
      const res = await createOutwardMutation.mutateAsync(fields);
      const entry = res.data;
      if (invoice_document) {
        try {
          await uploadOutwardDocMutation.mutateAsync({ id: entry.outwardId, file: invoice_document });
        } catch (docErr) {
          setErrModal({ open: true, message: `Entry recorded, but the invoice document failed to upload: ${docErr.message}` });
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
      if (invoice_document) {
        try {
          await uploadInwardDocMutation.mutateAsync({ id, file: invoice_document });
        } catch (docErr) {
          setErrModal({ open: true, message: `Entry updated, but the invoice document failed to upload: ${docErr.message}` });
        }
      }
      setEditEntry(null);
      showSuccess("Inward entry updated");
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  const handleViewInvoiceDoc = (item) => {
    const id = item.inward_id || item.inwardId;
    openAuthedFile(gateApi.invoiceDocUrl(id)).catch((e) => setErrModal({ open: true, message: `Could not open the invoice document: ${e.message}` }));
  };

  const submitEditOutward = async (form) => {
    const { invoice_document, ...fields } = form;
    const id = editEntry.item.outward_id || editEntry.item.outwardId;
    try {
      await editOutwardMutation.mutateAsync({ id, data: fields });
      if (invoice_document) {
        try {
          await uploadOutwardDocMutation.mutateAsync({ id, file: invoice_document });
        } catch (docErr) {
          setErrModal({ open: true, message: `Entry updated, but the invoice document failed to upload: ${docErr.message}` });
        }
      }
      setEditEntry(null);
      showSuccess("Outward entry updated");
    } catch (e) {
      setErrModal({ open: true, message: e.message });
    }
  };

  const handleViewOutwardInvoiceDoc = (item) => {
    const id = item.outward_id || item.outwardId;
    openAuthedFile(gateApi.outwardInvoiceDocUrl(id)).catch((e) => setErrModal({ open: true, message: `Could not open the invoice document: ${e.message}` }));
  };

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
                <>
                  <Button variant="primary" icon={ArrowDown} onClick={() => openList("inward")}>Inward Entries</Button>
                  <Button variant="purple"  icon={ArrowUp}   onClick={() => openList("outward")}>Outward Entries</Button>
                </>
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
          INWARD LIST
          ════════════════════════════════════════════════════ */}
      {view === "inward-list" && (
        <>
          <PageHeader icon={ArrowDown} title="Inward Entries" actions={<BackButton onClick={goHome} />} />

          <div className="ge-body">
            {successMsg && (
              <div className="ge-success">
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            <GateToolbar
              tab="inward"
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
              : <InwardTable
                  list={list}
                  total={total}
                  onRequestDelete={(id) => handleRequestDelete(id, "inward")}
                  onEdit={(item) => handleEdit(item, "inward")}
                  onViewDocument={handleViewInvoiceDoc}
                />
            }
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          OUTWARD LIST
          ════════════════════════════════════════════════════ */}
      {view === "outward-list" && (
        <>
          <PageHeader icon={ArrowUp} title="Outward Entries" actions={<BackButton onClick={goHome} />} />

          <div className="ge-body">
            {successMsg && (
              <div className="ge-success">
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            <GateToolbar
              tab="outward"
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
              : <OutwardTable
                  list={list}
                  total={total}
                  onRequestDelete={(id) => handleRequestDelete(id, "outward")}
                  onEdit={(item) => handleEdit(item, "outward")}
                  onViewDocument={handleViewOutwardInvoiceDoc}
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
            existingDocument={{ fileName: editEntry.item.invoice_doc_file_name || editEntry.item.invoiceDocFileName || "" }}
            onViewDocument={() => handleViewInvoiceDoc(editEntry.item)}
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
            existingDocument={{ fileName: editEntry.item.invoice_doc_file_name || editEntry.item.invoiceDocFileName || "" }}
            onViewDocument={() => handleViewOutwardInvoiceDoc(editEntry.item)}
            onSubmit={submitEditOutward}
            onCancel={() => setEditEntry(null)}
          />
        )}
      </Modal>
    </div>
  );
}
