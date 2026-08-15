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
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useToast } from '../components/common/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { listRecords } from '../api/http.js';

function isFilterableSelectField(field) {
  return field.type === 'select' && field.options?.length;
}
function isFilterableDateField(field) {
  return !field.readOnly && (field.type === 'date' || field.type === 'datetime-local');
}
// A resource's own `filters: ['fieldA', 'fieldB']` (field-name list) wins
// when present; otherwise every select-with-options field plus every date
// field is offered — a strict superset of the old "first select + first
// date only" behavior, so every resource gets *some* real filter panel.
function resolveFilterFields(resource) {
  if (Array.isArray(resource.filters) && resource.filters.length) {
    return resource.filters
      .map((name) => resource.fields.find((f) => f.name === name))
      .filter(Boolean);
  }
  return resource.fields.filter((f) => isFilterableSelectField(f) || isFilterableDateField(f));
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

export default function ResourcePage({ resource }) {
  const { quickCreateRequestId } = useOutletContext();
  const { hasPermission } = useAuth();
  // Three distinct permissions cover this page's write surface: single-record
  // add/edit/delete goes through the generic panel CRUD (admin.panel.manage),
  // "Delete selected"/"Delete all" go through the Data Management pipeline
  // (admin.data-management.manage), and "Transform text" goes through the
  // bulk-transform API (admin.bulk-transform.manage) — see backend/src/routers/routers.js.
  const canWrite = hasPermission('admin.panel.manage');
  const canBulkTransform = hasPermission('admin.bulk-transform.manage');
  const canManageData = hasPermission('admin.data-management.manage');

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 350);
  const [filterValues, setFilterValues] = useState({});

  const {
    records, total, page, limit, loading, saving, error,
    setPage, setLimit, reload, save, remove,
  } = useResourceRecords(resource, { search: debouncedQuery, filters: filterValues });

  const { visit } = useRecentPages();
  const { pinned, isPinned, togglePin } = usePinnedRecords(resource.key);
  const showToast = useToast();

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

  // A search term or filter selection from a previously-viewed resource
  // shouldn't silently carry over and narrow a totally different table.
  useEffect(() => {
    setQuery('');
    setFilterValues({});
  }, [resource.key]);

  useKeyboardShortcuts({ searchRef, onNew: () => setModalState({ mode: 'create' }) });

  const filterFields = useMemo(() => resolveFilterFields(resource), [resource]);

  const stats = useMemo(() => computeStats(resource, records, total), [resource, records, total]);

  // records/total are already search+filter-narrowed by the backend (see
  // useResourceRecords) — no client-side re-filtering needed here anymore.
  const allPageSelected = records.length > 0 && records.every((rec) => selectedIds.has(getLocalId(resource, rec)));
  const somePageSelected = !allPageSelected && records.some((rec) => selectedIds.has(getLocalId(resource, rec)));

  // The header checkbox means "everything matching the current search/
  // filters", not just this page — records is server-paginated (default
  // 100/page, backend caps a single request at 500 regardless), so for any
  // result set bigger than one page this has to page through the rest
  // (using the same search/filters, which the server now applies) rather
  // than only ever select what happens to be loaded on screen.
  async function handleToggleAll() {
    if (allPageSelected) {
      setSelectedIds(new Set());
      return;
    }
    if (records.length >= total) {
      setSelectedIds(new Set(records.map((rec) => getLocalId(resource, rec))));
      return;
    }
    setSelectingAll(true);
    try {
      const PAGE_SIZE = 500; // backend's hard cap per request
      const filtersJson = JSON.stringify(filterValues);
      const all = [];
      for (let p = 1; ; p++) {
        const { data } = await listRecords(resource, { page: p, limit: PAGE_SIZE, search: debouncedQuery, filters: filtersJson });
        all.push(...data);
        if (data.length < PAGE_SIZE || all.length >= total) break;
      }
      setSelectedIds(new Set(all.map((rec) => getLocalId(resource, rec))));
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
    setFilterValues({});
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
    <div className="space-y-4">
      <PageHeader
        eyebrow={resource.model}
        title={resource.title}
        description={resource.description}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Database} onClick={() => setSchemaOpen(true)}>Schema</Button>
            {canWrite && (
              <Button icon={Plus} onClick={() => setModalState({ mode: 'create' })}>Add Record</Button>
            )}
          </div>
        }
      />

      {loading ? (
        <StatsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
            filterFields={filterFields}
            filterValues={filterValues}
            onFilterChange={(name, value) => setFilterValues((v) => ({ ...v, [name]: value }))}
            onExport={() => exportToCsv(resource, records)}
            onImport={() => setImportOpen(true)}
            onRefresh={reload}
            onReset={resetFilters}
            canImport={canWrite}
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">{selectedIds.size} selected</span>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-blue-500 hover:underline">Clear</button>
            {canBulkTransform && (
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
            )}
            {canManageData && (
              <Button
                variant="danger"
                size="sm"
                className={canBulkTransform ? '' : 'ml-auto'}
                onClick={() => setDeleteFlow({
                  deleteType: 'RECORD',
                  table: modelAccessorFor(resource),
                  ids: recordIdsFor(resource, records.filter((rec) => selectedIds.has(getLocalId(resource, rec)))),
                })}
              >
                Delete selected
              </Button>
            )}
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
          records={records}
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
          canWrite={canWrite}
        />

        {!loading && records.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <Pagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />
          </div>
        )}
      </Card>

      {canManageData && (
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
      )}

      <RowDetailDrawer
        resource={resource}
        record={drawerRecord}
        onClose={() => setDrawerRecord(null)}
        onEdit={(rec) => setModalState({ mode: 'edit', record: rec })}
        onDelete={setDeleteTarget}
        isPinned={drawerRecord ? isPinned(getLocalId(resource, drawerRecord)) : false}
        onTogglePin={drawerRecord ? () => togglePin(getLocalId(resource, drawerRecord)) : undefined}
        canWrite={canWrite}
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
