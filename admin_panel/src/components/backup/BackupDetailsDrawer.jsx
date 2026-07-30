import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, RotateCcw, Trash2 } from 'lucide-react';
import Button from '../common/Button.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import DownloadMenu from './DownloadMenu.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getBackupDetails, downloadBackup, downloadBackupExcel } from '../../api/backup.js';

function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[140px_1fr] gap-4 py-3 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide pt-0.5">{label}</div>
    <div className="text-sm text-slate-700 dark:text-slate-300 break-words">{children}</div>
  </div>
);

export default function BackupDetailsDrawer({ backupId, onClose, onRestore, onDelete }) {
  const { isReadOnly } = useAuth();
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (!backupId) { setJob(null); return; }
    getBackupDetails(backupId).then(setJob).catch(() => setJob(null));
  }, [backupId]);

  return createPortal(
    <AnimatePresence>
      {backupId && (
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
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Backup Details</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{job?.name || '…'}</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {job && (
              <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-2">
                <Row label="Status"><StatusBadge value={job.status} /></Row>
                <Row label="Type">{job.type}</Row>
                <Row label="Created By">{job.createdByName || job.createdBy || '—'}</Row>
                <Row label="Created At">{fmtDate(job.createdAt)}</Row>
                <Row label="Completed At">{fmtDate(job.completedAt)}</Row>
                <Row label="Tables">{job.tableCount}</Row>
                <Row label="Records">{job.recordCount.toLocaleString()}</Row>
                <Row label="File Size">{formatBytes(job.fileSizeBytes)}</Row>
                {job.errorMessage && <Row label="Error"><span className="text-red-600 dark:text-red-400">{job.errorMessage}</span></Row>}

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

                {job.restores?.length > 0 && (
                  <Row label="Restore History">
                    <div className="space-y-2">
                      {job.restores.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{fmtDate(r.startedAt)} — {r.startedByName || r.startedBy || 'unknown'}</span>
                          <StatusBadge value={r.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  </Row>
                )}
              </div>
            )}

            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <DownloadMenu
                variant="text"
                disabled={job?.status !== 'COMPLETED'}
                onDownloadOriginal={() => downloadBackup(job.id, job.fileName)}
                onExportExcel={() => downloadBackupExcel(job.id, job.name)}
              />
              {!isReadOnly && (
                <>
                  <Button
                    variant="secondary"
                    icon={RotateCcw}
                    disabled={job?.status !== 'COMPLETED'}
                    onClick={() => onRestore(job)}
                  >
                    Restore
                  </Button>
                  <Button variant="danger" icon={Trash2} onClick={() => onDelete(job)} className="ml-auto">Delete</Button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
