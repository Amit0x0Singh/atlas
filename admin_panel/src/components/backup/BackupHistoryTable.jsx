import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Trash2, Eye, RefreshCw } from 'lucide-react';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import EmptyState from '../common/EmptyState.jsx';
import DeleteDialog from '../common/DeleteDialog.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import SearchBar from '../table/SearchBar.jsx';
import Pagination from '../table/Pagination.jsx';
import DownloadMenu from './DownloadMenu.jsx';
import { useToast } from '../common/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listBackups, deleteBackup, downloadBackup, downloadBackupExcel } from '../../api/backup.js';

function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

const TYPE_LABEL = { FULL: 'Full', MODULE: 'Module', SELECTED: 'Selected Tables' };

export default function BackupHistoryTable({ refreshSignal, onViewDetails, onRestore }) {
  const showToast = useToast();
  const { isReadOnly } = useAuth();

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBackups({ page, limit, query: query || undefined, type: type || undefined, status: status || undefined });
      setRecords(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Unable to load backup history.', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, query, type, status]);

  useEffect(() => { load(); }, [load, refreshSignal]);
  useEffect(() => { setPage(1); }, [query, type, status]);

  async function handleDownload(job) {
    try {
      await downloadBackup(job.id, job.fileName);
    } catch {
      showToast('Unable to download backup.', 'danger');
    }
  }

  async function handleExportExcel(job) {
    try {
      await downloadBackupExcel(job.id, job.name);
    } catch {
      showToast('Unable to export to Excel.', 'danger');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBackup(deleteTarget.id);
      showToast('Backup deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Unable to delete backup.', 'danger');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card padding={false}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search backups…" className="w-64" />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All types</option>
          <option value="FULL">Full</option>
          <option value="MODULE">Module</option>
          <option value="SELECTED">Selected Tables</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="RUNNING">Running</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={load} className="ml-auto">Refresh</Button>
      </div>

      {!loading && records.length === 0 ? (
        <EmptyState title="No backups yet" description="Create your first backup to see it listed here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Name</th>
                <th className="text-left font-semibold px-4 py-2.5">Type</th>
                <th className="text-left font-semibold px-4 py-2.5">Created By</th>
                <th className="text-left font-semibold px-4 py-2.5">Created At</th>
                <th className="text-right font-semibold px-4 py-2.5">Tables</th>
                <th className="text-right font-semibold px-4 py-2.5">Records</th>
                <th className="text-right font-semibold px-4 py-2.5">Size</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                <th className="text-right font-semibold px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">{job.name}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{TYPE_LABEL[job.type] ?? job.type}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{job.createdByName || job.createdBy || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(job.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{job.tableCount}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{job.recordCount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">{formatBytes(job.fileSizeBytes)}</td>
                  <td className="px-4 py-2.5"><StatusBadge value={job.status} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => onViewDetails(job)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                      >
                        <Eye size={15} />
                      </button>
                      <DownloadMenu
                        disabled={job.status !== 'COMPLETED'}
                        onDownloadOriginal={() => handleDownload(job)}
                        onExportExcel={() => handleExportExcel(job)}
                      />
                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            title="Restore"
                            disabled={job.status !== 'COMPLETED'}
                            onClick={() => onRestore(job)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <RotateCcw size={15} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            disabled={job.status === 'RUNNING'}
                            onClick={() => setDeleteTarget(job)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <Pagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />
        </div>
      )}

      <DeleteDialog
        open={!!deleteTarget}
        title="Delete this backup?"
        message={<>This permanently removes <strong>{deleteTarget?.name}</strong> and its backup file. This cannot be undone.</>}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  );
}
