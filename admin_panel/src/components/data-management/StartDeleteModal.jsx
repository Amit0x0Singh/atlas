import { useEffect, useMemo, useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import SearchBar from '../table/SearchBar.jsx';
import DestructiveActionDialog from '../common/DestructiveActionDialog.jsx';
import ProgressBar from '../backup/ProgressBar.jsx';
import { useToast } from '../common/Toast.jsx';
import { useJobPolling } from '../../hooks/useJobPolling.js';
import { previewImpact, createDelete, getDeleteStatus } from '../../api/data-management.js';
import { NAV_GROUPS } from '../../data/navGroups.js';

const TYPES = [
  { value: 'TABLE', label: 'Table-wise', description: 'Delete every row in one table.' },
  { value: 'MODULE', label: 'Module-wise', description: 'Delete every table in one or more modules.' },
  { value: 'SELECTED', label: 'Selected Tables', description: 'Pick individual tables.' },
];

const TYPE_LABEL = { RECORD: 'Record-wise', TABLE: 'Table-wise', MODULE: 'Module-wise', SELECTED: 'Selected Tables' };

// Wizard: pick scope (skipped when `initialScope` pre-scopes it, e.g. from a
// ResourcePage's "Delete all records"/"Delete selected" buttons) → preview
// impact (with an option to expand scope over any external references) →
// type-DELETE + password confirm → progress.
export default function StartDeleteModal({ open, onClose, onDone, tables, initialScope }) {
  const showToast = useToast();
  const [step, setStep] = useState('pick'); // pick | preview | confirm | progress
  const [deleteType, setDeleteType] = useState('TABLE');
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [tableFilter, setTableFilter] = useState('');

  const [payload, setPayload] = useState(null); // the exact body sent to preview/create
  const [impact, setImpact] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [includedExtra, setIncludedExtra] = useState([]); // tables added via "include this too"

  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const job = useJobPolling(jobId, getDeleteStatus);

  const groupCounts = useMemo(() => {
    const counts = {};
    for (const t of tables) counts[t.group] = (counts[t.group] || 0) + 1;
    return counts;
  }, [tables]);

  const filteredTables = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    return tables.filter((t) => !q || t.key.toLowerCase().includes(q) || t.model.toLowerCase().includes(q));
  }, [tables, tableFilter]);

  useEffect(() => {
    if (!open) return;
    if (initialScope) {
      // Pre-scoped from a ResourcePage button — skip straight to the preview
      // step, but still have to actually fetch the impact data for it.
      runPreview(initialScope);
    } else {
      setStep('pick');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialScope]);

  function reset() {
    setStep('pick'); setDeleteType('TABLE'); setSelectedModules([]); setSelectedTables([]);
    setTableFilter(''); setPayload(null); setImpact(null); setPreviewing(false);
    setPreviewError(''); setIncludedExtra([]); setSubmitting(false); setJobId(null);
  }
  function handleClose() {
    reset();
    onClose();
  }

  async function runPreview(nextPayload) {
    setPreviewing(true);
    setPreviewError('');
    try {
      const res = await previewImpact(nextPayload);
      setImpact(res);
      setPayload(nextPayload);
      setStep('preview');
    } catch (err) {
      setPreviewError(err?.response?.data?.error || 'Unable to preview impact.');
    } finally {
      setPreviewing(false);
    }
  }

  function handlePickSubmit() {
    let nextPayload;
    if (deleteType === 'MODULE') {
      if (!selectedModules.length) return setPreviewError('Pick at least one module.');
      nextPayload = { deleteType: 'MODULE', modules: selectedModules };
    } else if (deleteType === 'SELECTED') {
      if (!selectedTables.length) return setPreviewError('Pick at least one table.');
      nextPayload = { deleteType: 'SELECTED', tables: selectedTables };
    } else {
      if (!selectedTables.length) return setPreviewError('Pick a table.');
      nextPayload = { deleteType: 'TABLE', table: selectedTables[0] };
    }
    runPreview(nextPayload);
  }

  function includeExtraTable(table) {
    const next = [...includedExtra, table];
    setIncludedExtra(next);
    const baseTables = impact?.scopeTables ?? [];
    runPreview({ deleteType: 'SELECTED', tables: [...new Set([...baseTables, ...next])] });
  }

  async function handleConfirmed() {
    setSubmitting(true);
    try {
      const res = await createDelete(payload);
      setJobId(res.id);
      setStep('progress');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Unable to start delete.', 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (job?.status === 'COMPLETED') {
      showToast('Delete completed.');
      onDone();
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  const confirmSummary = impact && (
    <>
      This will permanently delete <strong>{impact.recordCount.toLocaleString()} record(s)</strong> across{' '}
      <strong>{impact.scopeTables.length} table(s)</strong> ({impact.scopeTables.join(', ')}). A backup of this data
      is created automatically first, and can be restored later from Backup History. This action cannot be undone
      directly.
    </>
  );

  return (
    <>
      <Modal open={open && step !== 'confirm'} onClose={submitting ? undefined : handleClose} size="lg">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Delete Data</h2>

          {step === 'pick' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 block">Delete Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setDeleteType(t.value); setSelectedModules([]); setSelectedTables([]); }}
                      className={[
                        'text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                        deleteType === t.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                      ].join(' ')}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {deleteType === 'MODULE' && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 block">Modules</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto scrollbar-thin border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                    {NAV_GROUPS.filter((g) => groupCounts[g.key]).map((g) => (
                      <label key={g.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedModules.includes(g.key)}
                          onChange={() => setSelectedModules((prev) => prev.includes(g.key) ? prev.filter((k) => k !== g.key) : [...prev, g.key])}
                          className="accent-red-600"
                        />
                        <span style={{ color: g.color }} className="font-medium">{g.label}</span>
                        <span className="text-xs text-slate-400 ml-auto">{groupCounts[g.key]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(deleteType === 'SELECTED' || deleteType === 'TABLE') && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 block">
                    {deleteType === 'TABLE' ? 'Table' : `Tables ${selectedTables.length > 0 ? `(${selectedTables.length} selected)` : ''}`}
                  </label>
                  <SearchBar value={tableFilter} onChange={setTableFilter} placeholder="Filter tables…" className="mb-2" />
                  <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto scrollbar-thin border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                    {filteredTables.map((t) => (
                      <label key={t.key} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer">
                        <input
                          type={deleteType === 'TABLE' ? 'radio' : 'checkbox'}
                          name="table-pick"
                          checked={selectedTables.includes(t.model)}
                          onChange={() => setSelectedTables(deleteType === 'TABLE' ? [t.model] : (prev) => prev.includes(t.model) ? prev.filter((m) => m !== t.model) : [...prev, t.model])}
                          className="accent-red-600"
                        />
                        <span className="truncate">{t.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {previewError && <p className="text-sm text-red-600 dark:text-red-400">{previewError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button variant="danger-solid" icon={Trash2} loading={previewing} onClick={handlePickSubmit}>Preview Impact</Button>
              </div>
            </div>
          )}

          {step === 'preview' && impact && (
            <div className="space-y-5">
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {impact.recordCount.toLocaleString()} record(s) across {impact.scopeTables.length} table(s) will be permanently deleted.
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  A backup is created automatically before anything is removed, and this delete can be undone by restoring it from Backup History.
                </p>
              </div>

              <div className="border border-slate-100 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                {impact.scopeTables.map((t) => (
                  <div key={t} className="flex justify-between px-3 py-2 text-sm">
                    <span className="font-mono text-slate-600 dark:text-slate-300">{t}</span>
                    <span className="text-slate-500 dark:text-slate-400">{(impact.tableBreakdownPreview[t] ?? 0).toLocaleString()} row(s)</span>
                  </div>
                ))}
              </div>

              {impact.externalReferences.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 space-y-2">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> This may affect related modules
                  </p>
                  {impact.externalReferences.map((ref) => (
                    <div key={`${ref.parentTable}-${ref.table}`} className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                      <span>
                        <strong>{ref.count.toLocaleString()}</strong> row(s) in <span className="font-mono">{ref.table}</span> reference <span className="font-mono">{ref.parentTable}</span>
                      </span>
                      {!includedExtra.includes(ref.table) && (
                        <button
                          type="button"
                          onClick={() => includeExtraTable(ref.table)}
                          className="text-xs underline hover:no-underline flex-shrink-0 ml-2"
                        >
                          Include this table too
                        </button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    You can include the referencing table(s) above, or proceed anyway — if the database rejects the
                    delete due to a real constraint, nothing will be removed and you'll see a clear error.
                  </p>
                </div>
              )}

              {previewError && <p className="text-sm text-red-600 dark:text-red-400">{previewError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button variant="danger-solid" icon={Trash2} loading={previewing} onClick={() => setStep('confirm')}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'progress' && (
            <div className="py-4 space-y-4">
              <ProgressBar
                value={job?.tablesDone ?? 0}
                max={job?.tablesTotal ?? 0}
                indeterminate={!job || ['PENDING', 'BACKING_UP'].includes(job.status) || job.tablesTotal === 0}
                label={
                  job?.status === 'FAILED'
                    ? 'Delete failed'
                    : job?.status === 'BACKING_UP'
                      ? 'Creating safety backup…'
                      : job?.currentTable
                        ? `Deleting ${job.currentTable} — ${job.tablesDone} of ${job.tablesTotal} tables`
                        : 'Preparing…'
                }
              />
              {job?.status === 'FAILED' && (
                <>
                  <p className="text-sm text-red-600 dark:text-red-400">{job.errorMessage}</p>
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={handleClose}>Close</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>

      <DestructiveActionDialog
        open={open && step === 'confirm'}
        title={`Delete ${TYPE_LABEL[payload?.deleteType] ?? ''} data?`}
        summary={confirmSummary}
        onConfirm={handleConfirmed}
        onCancel={() => setStep('preview')}
      />
    </>
  );
}
