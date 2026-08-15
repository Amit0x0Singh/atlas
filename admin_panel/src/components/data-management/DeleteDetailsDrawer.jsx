import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';
import Button from '../common/Button.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDeleteDetails } from '../../api/data-management.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TYPE_LABEL = { RECORD: 'Record-wise', TABLE: 'Table-wise', MODULE: 'Module-wise', SELECTED: 'Selected Tables' };

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[140px_1fr] gap-4 py-3 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide pt-0.5">{label}</div>
    <div className="text-sm text-slate-700 dark:text-slate-300 break-words">{children}</div>
  </div>
);

// Rather than building a parallel restore UI, "Restore Linked Backup" opens
// the existing, unmodified Backup & Restore RestoreBackupModal preset to the
// backup this delete automatically created — one restore flow, reused.
export default function DeleteDetailsDrawer({ deleteJobId, onClose, onRestoreBackup }) {
  const { hasPermission } = useAuth();
  const isReadOnly = !hasPermission('admin.data-management.manage');
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (!deleteJobId) { setJob(null); return; }
    getDeleteDetails(deleteJobId).then(setJob).catch(() => setJob(null));
  }, [deleteJobId]);

  return createPortal(
    <AnimatePresence>
      {deleteJobId && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 z-[90]" onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] bg-white dark:bg-slate-900 shadow-2xl z-[95] flex flex-col"
          >
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Delete Details</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {job ? (TYPE_LABEL[job.deleteType] ?? job.deleteType) : '…'}
                </h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {job && (
              <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-2">
                <Row label="Status"><StatusBadge value={job.status} /></Row>
                <Row label="Deleted By">{job.deletedByName || job.deletedBy || '—'}</Row>
                <Row label="Deleted At">{fmtDate(job.createdAt)}</Row>
                <Row label="Completed At">{fmtDate(job.completedAt)}</Row>
                <Row label="Tables">{job.tables?.join(', ')}</Row>
                <Row label="Records Deleted">{job.recordCount.toLocaleString()}</Row>
                {job.remarks && <Row label="Remarks">{job.remarks}</Row>}
                {job.errorMessage && <Row label="Error"><span className="text-red-600 dark:text-red-400">{job.errorMessage}</span></Row>}

                {job.recordScope?.ids?.length > 0 && (
                  <Row label="Record IDs">
                    <div className="space-y-1">
                      {job.recordScope.ids.map((row, i) => (
                        <div key={i} className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </div>
                      ))}
                    </div>
                  </Row>
                )}

                {job.tableBreakdown && Object.keys(job.tableBreakdown).length > 0 && (
                  <Row label="Per-Table">
                    <div className="space-y-1">
                      {Object.entries(job.tableBreakdown).map(([table, count]) => (
                        <div key={table} className="flex justify-between text-xs">
                          <span className="font-mono text-slate-500 dark:text-slate-400">{table}</span>
                          <span className="text-slate-600 dark:text-slate-300">{count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </Row>
                )}

                {job.backupJob && (
                  <Row label="Auto-Backup">
                    <div className="text-xs space-y-1">
                      <div>{job.backupJob.name}</div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={job.backupJob.status} size="sm" />
                        <span className="text-slate-400">{job.backupJob.scope === 'PARTIAL' ? 'Row-scoped' : 'Full table'}</span>
                      </div>
                    </div>
                  </Row>
                )}
              </div>
            )}

            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              {!isReadOnly && job?.backupJob?.status === 'COMPLETED' && (
                <Button variant="secondary" icon={RotateCcw} className="ml-auto" onClick={() => onRestoreBackup(job.backupJob)}>
                  Restore Linked Backup
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
