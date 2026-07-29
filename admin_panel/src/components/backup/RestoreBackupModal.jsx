import { useEffect, useState } from 'react';
import { Upload, History, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import ProgressBar from './ProgressBar.jsx';
import { useToast } from '../common/Toast.jsx';
import { useJobPolling } from '../../hooks/useJobPolling.js';
import { listBackups, restoreFromHistory, restoreFromUpload, getRestoreStatus } from '../../api/backup.js';

// Two entry points: a specific backup passed in via `presetJob` (from a
// history row or the details drawer) skips straight to the confirm step;
// the page-level "Restore Backup" button opens with no preset and offers a
// choice between uploading a file or picking one from history.
export default function RestoreBackupModal({ open, onClose, onDone, presetJob }) {
  const showToast = useToast();
  const [mode, setMode] = useState('choose'); // choose | pick-history | confirm | progress
  const [historyOptions, setHistoryOptions] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState('');

  const job = useJobPolling(jobId, getRestoreStatus);

  useEffect(() => {
    if (!open) return;
    if (presetJob) {
      setSelectedBackup(presetJob);
      setMode('confirm');
    } else {
      setMode('choose');
    }
  }, [open, presetJob]);

  useEffect(() => {
    if (job?.status === 'COMPLETED') {
      showToast('Restore completed.');
      onDone();
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  function reset() {
    setMode('choose'); setHistoryOptions([]); setSelectedBackup(null);
    setFile(null); setSubmitting(false); setJobId(null); setError('');
  }
  function handleClose() {
    reset();
    onClose();
  }

  async function openPickHistory() {
    setMode('pick-history');
    try {
      const res = await listBackups({ status: 'COMPLETED', limit: 100 });
      setHistoryOptions(res.data ?? []);
    } catch {
      setError('Unable to load backup history.');
    }
  }

  function pickHistoryBackup(backup) {
    setSelectedBackup(backup);
    setMode('confirm');
  }

  function handleFileChosen(f) {
    if (!f) return;
    setFile(f);
    setSelectedBackup(null);
    setMode('confirm');
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError('');
    try {
      const res = file ? await restoreFromUpload(file) : await restoreFromHistory(selectedBackup.id);
      setJobId(res.id);
      setMode('progress');
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to start restore.');
      setSubmitting(false);
    }
  }

  // A PARTIAL (row-scoped) backup — e.g. the Data Management module's
  // auto-safeguard backup before a Record-wise delete — only ever
  // re-inserts the specific rows it contains; it never wipes the table
  // first, so the warning here is materially less scary than for a FULL
  // backup and should say so rather than implying the whole table is at risk.
  const confirmMessage = selectedBackup
    ? selectedBackup.scope === 'PARTIAL'
      ? <>This will re-insert the previously removed row(s) from "{selectedBackup.name}" into <strong>{selectedBackup.tableCount} table(s)</strong>. It will not remove or alter any other current data in these tables.</>
      : <>This will permanently overwrite data in <strong>{selectedBackup.tableCount} table(s)</strong> from "{selectedBackup.name}". This cannot be undone.</>
    : <>This will permanently overwrite data in the table(s) contained in <strong>{file?.name}</strong>. This cannot be undone.</>;

  return (
    <Modal open={open} onClose={submitting ? undefined : handleClose} size="md">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Restore Backup</h2>

        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={openPickHistory}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
            >
              <History size={22} className="text-blue-600" />
              Pick from history
            </button>
            <label className="flex flex-col items-center gap-2 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer">
              <Upload size={22} className="text-blue-600" />
              Upload a file
              <input type="file" accept=".gz" className="hidden" onChange={(e) => handleFileChosen(e.target.files?.[0])} />
            </label>
          </div>
        )}

        {mode === 'pick-history' && (
          <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
            {historyOptions.length === 0 && <p className="text-sm text-slate-400">No completed backups available.</p>}
            {historyOptions.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => pickHistoryBackup(b)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center justify-between"
              >
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">{b.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{b.tableCount} table(s)</span>
              </button>
            ))}
          </div>
        )}

        {mode === 'confirm' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 text-red-600 bg-red-50 dark:bg-red-950">
              <AlertTriangle size={22} />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{confirmMessage}</div>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" fullWidth onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button variant="danger-solid" fullWidth loading={submitting} onClick={handleConfirm}>Restore</Button>
            </div>
          </div>
        )}

        {mode === 'progress' && (
          <div className="py-4 space-y-4">
            <ProgressBar
              value={job?.tablesDone ?? 0}
              max={job?.tablesTotal ?? 0}
              indeterminate={!job || ['PENDING', 'VALIDATING'].includes(job.status) || job.tablesTotal === 0}
              label={
                job?.status === 'FAILED'
                  ? 'Restore failed'
                  : job?.status === 'VALIDATING'
                    ? 'Validating backup file…'
                    : job?.currentTable
                      ? `Restoring ${job.currentTable} — ${job.tablesDone} of ${job.tablesTotal} tables`
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
