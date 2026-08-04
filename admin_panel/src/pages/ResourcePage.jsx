import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Database, Type } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import DeleteDialog from '../components/common/DeleteDialog.jsx';
import { StatsSkeleton } from '../components/common/PageSkeleton.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { computeStats } from '../components/dashboard/stats.js';
import Toolbar from '../components/table/Toolbar.jsx';
import DataTable from '../components/table/DataTable.jsx';
import Pagination from '../components/table/Pagination.jsx';
import RowDetailDrawer from '../components/table/RowDetailDrawer.jsx';
import SchemaModal from '../components/table/SchemaModal.jsx';
import StartDeleteModal from '../components/data-management/StartDeleteModal.jsx';
import BulkTransformModal from '../components/table/BulkTransformModal.jsx';
import { exportToCsv } from '../components/table/csv.js';
import DataFormModal from '../components/form/DataFormModal.jsx';
import ImportDialog from '../components/form/ImportDialog.jsx';
import { useResourceRecords } from '../hooks/useResourceRecords.js';
import { useRecentPages } from '../hooks/useRecentPages.js';
import { usePinnedRecords } from '../hooks/usePinnedRecords.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useToast } from '../components/common/Toast.jsx';
import { listRecords } from '../api/http.js';

function isStatusLikeField(field) {
  return field.type === 'select' && field.options?.length;
}
function isEditableDateField(field) {
  return !field.readOnly && (field.type === 'date' || field.type === 'datetime-local');
}
function getLocalId(resource, record) {
  return Array.isArray(resource.idField)
    ? resource.idField.map((f) => record[f]).join('-')
    : record[resource.idField];
}

// resource.model is the display-facing Prisma model name (e.g. 'GateInward');
// the Data Management/Backup APIs address tables by their Prisma Client
// accessor (camelCase first letter) — same transform used on the backend.
function modelAccessorFor(resource) {
  return resource.model.charAt(0).toLowerCase() + resource.model.slice(1);
}

function recordIdsFor(resource, records) {
  return records.map((r) =>
    Array.isArray(resource.idField)
      ? Object.fromEntries(resource.idField.map((f) => [f, r[f]]))
      : { [resource.idField]: r[resource.idField] },
  );
}

// Same query/status/date narrowing the Toolbar applies to the loaded page —
// factored out so "select all" can apply it to a freshly-fetched full
// dataset too, instead of only ever seeing whatever page is on screen.
function applyClientFilters(resource, list, { query, statusValue, statusField, dateField, dateRange }) {
  let out = list;
  const kw = query.trim().toLowerCase();
  if (kw) {
    out = out.filter((rec) => resource.fields.some((f) => String(rec[f.name] ?? '').toLowerCase().includes(kw)));
  }
  if (statusValue && statusField) {
    out = out.filter((rec) => String(rec[statusField.name]) === statusValue);
  }
  if (dateField && (dateRange.from || dateRange.to)) {
    out = out.filter((rec) => {
      const raw = rec[dateField.name];
      if (!raw) return false;
      const d = new Date(raw);
      if (dateRange.from && d < new Date(dateRange.from)) return false;
      if (dateRange.to && d > new Date(`${dateRange.to}T23:59:59`)) return false;
      return true;
    });
  }
  return out;
}

export default function ResourcePage({ resource }) {
  const { quickCreateRequestId } = useOutletContext();
  const {
    records, total, page, limit, loading, saving, error,
    setPage, setLimit, reload, save, remove,
  } = useResourceRecords(resource);

  const { visit } = useRecentPages();
  const { pinned, isPinned, togglePin } = usePinnedRecords(resource.key);
  const showToast = useToast();

  const [query, setQuery] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [modalState, setModalState] = useState(null);
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  // Pre-scoped Data Management delete flow — set by either "Delete all
  // records" ({deleteType:'TABLE'}) or "Delete selected" ({deleteType:
  // 'RECORD', ids}), both of which now go through the same backup-first,
  // audited, password-gated pipeline instead of the old direct-delete calls.
  const [deleteFlow, setDeleteFlow] = useState(null);
  // Bulk text transform, pre-scoped to the currently checked rows — same
  // "selected records → pass ids down" pattern as deleteFlow above.
  const [transformFlow, setTransformFlow] = useState(null);

  const searchRef = useRef(null);

  useEffect(() => { visit(resource.key); }, [resource.key, visit]);

  useEffect(() => {
    if (quickCreateRequestId) setModalState({ mode: 'create' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickCreateRequestId]);

  useKeyboardShortcuts({ searchRef, onNew: () => setModalState({ mode: 'create' }) });

  const statusField = resource.fields.find(isStatusLikeField);
  const dateField = resource.fields.find(isEditableDateField);

  const stats = useMemo(() => computeStats(resource, records, total), [resource, records, total]);

  const filtered = useMemo(
    () => applyClientFilters(resource, records, { query, statusValue, statusField, dateField, dateRange }),
    [resource, records, query, statusValue, statusField, dateField, dateRange],
  );

  const allPageSelected = filtered.length > 0 && filtered.every((rec) => selectedIds.has(getLocalId(resource, rec)));
  const somePageSelected = !allPageSelected && filtered.some((rec) => selectedIds.has(getLocalId(resource, rec)));

  // The header checkbox means "everything matching the current filters",
  // not just this page — records is server-paginated (default 100/page,
  // and the backend caps a single request at 500 regardless), so for any
  // table bigger than one page this has to page through the rest rather
  // than only ever select what happens to be loaded on screen.
  async function handleToggleAll() {
    if (allPageSelected) {
      setSelectedIds(new Set());
      return;
    }
    if (records.length >= total) {
      setSelectedIds(new Set(filtered.map((rec) => getLocalId(resource, rec))));
      return;
    }
    setSelectingAll(true);
    try {
      const PAGE_SIZE = 500; // backend's hard cap per request
      const all = [];
      for (let page = 1; ; page++) {
        const { data } = await listRecords(resource, { page, limit: PAGE_SIZE });
        all.push(...data);
        if (data.length < PAGE_SIZE || all.length >= total) break;
      }
      const matched = applyClientFilters(resource, all, { query, statusValue, statusField, dateField, dateRange });
      setSelectedIds(new Set(matched.map((rec) => getLocalId(resource, rec))));
    } catch (err) {
      showToast(err?.response?.data?.error || 'Unable to select all records.', 'danger');
    } finally {
      setSelectingAll(false);
    }
  }

  const pinnedRecords = useMemo(() => {
    if (!pinned.length) return [];
    return records.filter((rec) => pinned.includes(getLocalId(resource, rec)));
  }, [records, pinned, resource]);

  function resetFilters() {
    setQuery('');
    setStatusValue('');
    setDateRange({ from: '', to: '' });
  }

  async function handleSave(payload) {
    const ok = await save(modalState.mode, modalState.record, payload);
    if (ok) setModalState(null);
  }

  function handleDuplicate(record) {
    const clone = { ...record };
    resource.fields.forEach((f) => { if (f.readOnly) delete clone[f.name]; });
    setModalState({ mode: 'create', record: clone });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const ok = await remove(deleteTarget);
    if (ok) {
      setDrawerRecord(null);
      setDeleteTarget(null);
    }
  }

  function handleDeleteFlowDone() {
    setSelectedIds(new Set());
    reload();
  }

  function handleTransformFlowDone() {
    setSelectedIds(new Set());
    reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={resource.model}
        title={resource.title}
        description={resource.description}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Database} onClick={() => setSchemaOpen(true)}>Schema</Button>
            <Button icon={Plus} onClick={() => setModalState({ mode: 'create' })}>Add Record</Button>
          </div>
        }
      />

      {loading ? (
        <StatsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((s) => (
            <StatsCard key={s.key} label={s.label} value={s.value} icon={s.icon} accent={s.accent} caption={s.caption} />
          ))}
        </div>
      )}

      <Card padding={false}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <Toolbar
            searchRef={searchRef}
            query={query}
            onQueryChange={setQuery}
            statusField={statusField}
            statusOptions={statusField?.options || []}
            statusValue={statusValue}
            onStatusChange={setStatusValue}
            dateField={dateField}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={() => exportToCsv(resource, filtered)}
            onImport={() => setImportOpen(true)}
            onRefresh={reload}
            onReset={resetFilters}
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">{selectedIds.size} selected</span>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-blue-500 hover:underline">Clear</button>
            <Button
              variant="secondary"
              size="sm"
              icon={Type}
              className="ml-auto"
              onClick={() => setTransformFlow({
                ids: recordIdsFor(resource, records.filter((rec) => selectedIds.has(getLocalId(resource, rec)))),
              })}
            >
              Transform text
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteFlow({
                deleteType: 'RECORD',
                table: modelAccessorFor(resource),
                ids: recordIdsFor(resource, records.filter((rec) => selectedIds.has(getLocalId(resource, rec)))),
              })}
            >
              Delete selected
            </Button>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {pinnedRecords.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {pinnedRecords.map((rec, i) => {
              const id = getLocalId(resource, rec);
              const titleField = resource.fields.find((f) => f.name.toLowerCase().includes('name')) || resource.fields[0];
              return (
                <button
                  key={id ?? i}
                  type="button"
                  onClick={() => setDrawerRecord(rec)}
                  className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400"
                >
                  📌 {String(rec[titleField.name] ?? id)}
                </button>
              );
            })}
          </div>
        )}

        <DataTable
          resource={resource}
          records={filtered}
          loading={loading}
          onRowClick={setDrawerRecord}
          onEdit={(rec) => setModalState({ mode: 'edit', record: rec })}
          onDuplicate={handleDuplicate}
          onDelete={setDeleteTarget}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          allSelected={allPageSelected}
          someSelected={somePageSelected}
          onToggleAll={handleToggleAll}
          selectingAll={selectingAll}
        />

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <Pagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteFlow({ deleteType: 'TABLE', table: modelAccessorFor(resource) })}
          disabled={total === 0}
        >
          Delete all {total.toLocaleString()} records
        </Button>
      </div>

      <RowDetailDrawer
        resource={resource}
        record={drawerRecord}
        onClose={() => setDrawerRecord(null)}
        onEdit={(rec) => setModalState({ mode: 'edit', record: rec })}
        onDelete={setDeleteTarget}
        isPinned={drawerRecord ? isPinned(getLocalId(resource, drawerRecord)) : false}
        onTogglePin={drawerRecord ? () => togglePin(getLocalId(resource, drawerRecord)) : undefined}
      />

      {modalState && (
        <DataFormModal
          mode={modalState.mode}
          resource={resource}
          record={modalState.record}
          onClose={() => setModalState(null)}
          onSubmit={handleSave}
          saving={saving}
        />
      )}

      <ImportDialog open={importOpen} resource={resource} onClose={() => setImportOpen(false)} onDone={reload} />

      <SchemaModal open={schemaOpen} onClose={() => setSchemaOpen(false)} resource={resource} />

      <DeleteDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <StartDeleteModal
        open={!!deleteFlow}
        initialScope={deleteFlow}
        tables={[]}
        onClose={() => setDeleteFlow(null)}
        onDone={handleDeleteFlowDone}
      />

      {transformFlow && (
        <BulkTransformModal
          open={!!transformFlow}
          resource={resource}
          ids={transformFlow.ids}
          onClose={() => setTransformFlow(null)}
          onDone={handleTransformFlowDone}
        />
      )}
    </div>
  );
}
