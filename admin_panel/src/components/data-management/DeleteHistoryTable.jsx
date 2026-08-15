import { useCallback, useEffect, useState } from 'react';
import { Eye, Trash2, RefreshCw } from 'lucide-react';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import EmptyState from '../common/EmptyState.jsx';
import DeleteDialog from '../common/DeleteDialog.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import SearchBar from '../table/SearchBar.jsx';
import Pagination from '../table/Pagination.jsx';
import { useToast } from '../common/Toast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listDeletes, deleteDeleteJob } from '../../api/data-management.js';

const TYPE_LABEL = { RECORD: 'Record-wise', TABLE: 'Table-wise', MODULE: 'Module-wise', SELECTED: 'Selected Tables' };

export default function DeleteHistoryTable({ refreshSignal, onViewDetails }) {
  const showToast = useToast();
  const { hasPermission } = useAuth();
  const isReadOnly = !hasPermission('admin.data-management.manage');

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [deleteType, setDeleteType] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDeletes({ page, limit, query: query || undefined, deleteType: deleteType || undefined, status: status || undefined });
      setRecords(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Unable to load delete history.', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, query, deleteType, status]);

  useEffect(() => { load(); }, [load, refreshSignal]);
  useEffect(() => { setPage(1); }, [query, deleteType, status]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDeleteJob(deleteTarget.id);
      showToast('Delete history entry removed.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Unable to remove entry.', 'danger');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card padding={false}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search delete history…" className="w-64" />
        <select
          value={deleteType}
          onChange={(e) => setDeleteType(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All types</option>
          <option value="RECORD">Record-wise</option>
          <option value="TABLE">Table-wise</option>
          <option value="MODULE">Module-wise</option>
          <option value="SELECTED">Selected Tables</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="BACKING_UP">Backing Up</option>
          <option value="DELETING">Deleting</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={load} className="ml-auto">Refresh</Button>
      </div>

      {!loading && records.length === 0 ? (
        <EmptyState title="No deletes yet" description="Deletes you run through Data Management will be listed here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="text-left font-semibold px-3 py-1.5">Type</th>
                <th className="text-left font-semibold px-3 py-1.5">Affected Tables</th>
                <th className="text-left font-semibold px-3 py-1.5">Deleted By</th>
                <th className="text-left font-semibold px-3 py-1.5">Deleted At</th>
                <th className="text-right font-semibold px-3 py-1.5">Records</th>
                <th className="text-left font-semibold px-3 py-1.5">Status</th>
                <th className="text-right font-semibold px-3 py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{TYPE_LABEL[job.deleteType] ?? job.deleteType}</td>
                  <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">{job.tables?.join(', ')}</td>
                  <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{job.deletedByName || job.deletedBy || '—'}</td>
                  <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(job.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-600 dark:text-slate-300">{job.recordCount.toLocaleString()}</td>
                  <td className="px-3 py-1.5"><StatusBadge value={job.status} /></td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="View details"
                        onClick={() => onViewDetails(job)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                      >
                        <Eye size={15} />
                      </button>
                      {!isReadOnly && (
                        <button
                          type="button"
                          title="Remove from history"
                          disabled={job.status === 'BACKING_UP' || job.status === 'DELETING'}
                          onClick={() => setDeleteTarget(job)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Trash2 size={15} />
                        </button>
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
        title="Remove this delete history entry?"
        message="This only removes the history record — it does not affect the linked backup, which stays downloadable/restorable from Backup History."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  );
}
