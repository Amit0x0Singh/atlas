import { useEffect, useMemo, useState } from 'react';
import { Database } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import SearchBar from '../table/SearchBar.jsx';
import ProgressBar from './ProgressBar.jsx';
import { useToast } from '../common/Toast.jsx';
import { useJobPolling } from '../../hooks/useJobPolling.js';
import { createBackup, getBackupStatus } from '../../api/backup.js';
import { NAV_GROUPS } from '../../data/navGroups.js';

const TYPES = [
  { value: 'FULL', label: 'Full Database', description: 'Every table, all data.' },
  { value: 'MODULE', label: 'Module-wise', description: 'Pick one or more modules.' },
  { value: 'SELECTED', label: 'Selected Tables', description: 'Pick individual tables.' },
];

export default function CreateBackupModal({ open, onClose, onDone, tables }) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState('FULL');
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [tableFilter, setTableFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState('');

  const job = useJobPolling(jobId, getBackupStatus);

  const groupCounts = useMemo(() => {
    const counts = {};
    for (const t of tables) counts[t.group] = (counts[t.group] || 0) + 1;
    return counts;
  }, [tables]);

  const filteredTables = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    return tables.filter((t) => !q || t.key.toLowerCase().includes(q) || t.model.toLowerCase().includes(q));
  }, [tables, tableFilter]);

  function reset() {
    setName(''); setType('FULL'); setSelectedModules([]); setSelectedTables([]);
    setTableFilter(''); setSubmitting(false); setJobId(null); setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleModule(key) {
    setSelectedModules((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }
  function toggleTable(key) {
    setSelectedTables((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSubmit() {
    setError('');
    if (!name.trim()) return setError('Please give this backup a name.');
    if (type === 'MODULE' && selectedModules.length === 0) return setError('Pick at least one module.');
    if (type === 'SELECTED' && selectedTables.length === 0) return setError('Pick at least one table.');

    setSubmitting(true);
    try {
      const payload = { name: name.trim(), type };
      if (type === 'MODULE') payload.modules = selectedModules;
      if (type === 'SELECTED') payload.tables = selectedTables.map((key) => tables.find((t) => t.key === key)?.model).filter(Boolean);
      const res = await createBackup(payload);
      setJobId(res.id);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to start backup.');
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (job?.status === 'COMPLETED') {
      showToast(`Backup "${name || 'backup'}" completed.`);
      onDone();
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  return (
    <Modal open={open} onClose={submitting && !job ? undefined : handleClose} size="lg">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Create Backup</h2>

        {!jobId ? (
          <div className="space-y-5">
            <Input name="backupName" label="Backup Name" required value={name} onChange={(e) => setName(e.target.value)} />

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 block">Backup Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={[
                      'text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                      type === t.value
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

            {type === 'MODULE' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 block">Modules</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto scrollbar-thin border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  {NAV_GROUPS.filter((g) => groupCounts[g.key]).map((g) => (
                    <label key={g.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedModules.includes(g.key)} onChange={() => toggleModule(g.key)} className="accent-blue-600" />
                      <span style={{ color: g.color }} className="font-medium">{g.label}</span>
                      <span className="text-xs text-slate-400 ml-auto">{groupCounts[g.key]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {type === 'SELECTED' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 block">
                  Tables {selectedTables.length > 0 && `(${selectedTables.length} selected)`}
                </label>
                <SearchBar value={tableFilter} onChange={setTableFilter} placeholder="Filter tables…" className="mb-2" />
                <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto scrollbar-thin border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  {filteredTables.map((t) => (
                    <label key={t.key} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer">
                      <input type="checkbox" checked={selectedTables.includes(t.key)} onChange={() => toggleTable(t.key)} className="accent-blue-600" />
                      <span className="truncate">{t.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button icon={Database} loading={submitting} onClick={handleSubmit}>Create Backup</Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <ProgressBar
              value={job?.tablesDone ?? 0}
              max={job?.tablesTotal ?? 0}
              indeterminate={!job || job.tablesTotal === 0}
              label={
                job?.status === 'FAILED'
                  ? 'Backup failed'
                  : job?.currentTable
                    ? `Backing up ${job.currentTable} — ${job.tablesDone} of ${job.tablesTotal} tables`
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
  );
}
