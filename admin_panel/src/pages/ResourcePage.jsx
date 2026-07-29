import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Database } from 'lucide-react';
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
import { exportToCsv } from '../components/table/csv.js';
import DataFormModal from '../components/form/DataFormModal.jsx';
import ImportDialog from '../components/form/ImportDialog.jsx';
import { useResourceRecords } from '../hooks/useResourceRecords.js';
import { useRecentPages } from '../hooks/useRecentPages.js';
import { usePinnedRecords } from '../hooks/usePinnedRecords.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';

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

export default function ResourcePage({ resource }) {
  const { quickCreateRequestId } = useOutletContext();
  const {
    records, total, page, limit, loading, saving, error,
    setPage, setLimit, reload, save, remove, removeAll,
  } = useResourceRecords(resource);

  const { visit } = useRecentPages();
  const { pinned, isPinned, togglePin } = usePinnedRecords(resource.key);

  const [query, setQuery] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [modalState, setModalState] = useState(null);
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

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

  const filtered = useMemo(() => {
    let list = records;
    const kw = query.trim().toLowerCase();
    if (kw) {
      list = list.filter((rec) => resource.fields.some((f) => String(rec[f.name] ?? '').toLowerCase().includes(kw)));
    }
    if (statusValue && statusField) {
      list = list.filter((rec) => String(rec[statusField.name]) === statusValue);
    }
    if (dateField && (dateRange.from || dateRange.to)) {
      list = list.filter((rec) => {
        const raw = rec[dateField.name];
        if (!raw) return false;
        const d = new Date(raw);
        if (dateRange.from && d < new Date(dateRange.from)) return false;
        if (dateRange.to && d > new Date(`${dateRange.to}T23:59:59`)) return false;
        return true;
      });
    }
    return list;
  }, [records, query, statusValue, statusField, dateField, dateRange]);

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

  async function handleDeleteAll() {
    setDeletingAll(true);
    const ok = await removeAll();
    setDeletingAll(false);
    if (ok) setConfirmDeleteAll(false);
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const targets = records.filter((rec) => selectedIds.has(getLocalId(resource, rec)));
    for (const rec of targets) {
      // eslint-disable-next-line no-await-in-loop
      await remove(rec);
    }
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
    setSelectedIds(new Set());
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
            <Button variant="danger" size="sm" className="ml-auto" onClick={() => setConfirmBulkDelete(true)}>Delete selected</Button>
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
        />

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <Pagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteAll(true)} disabled={total === 0}>
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

      <DeleteDialog
        open={confirmDeleteAll}
        title="Delete all records?"
        message={<>This will permanently remove all <strong>{total.toLocaleString()}</strong> rows from <code>{resource.path}</code>. This cannot be undone.</>}
        confirmLabel="Delete all"
        loading={deletingAll}
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
      />

      <DeleteDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedIds.size} selected records?`}
        message="This cannot be undone."
        confirmLabel="Delete selected"
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}
