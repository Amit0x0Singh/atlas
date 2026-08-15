import { useEffect, useState } from 'react';
import { Trash2, ShieldAlert } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import DeleteHistoryTable from '../components/data-management/DeleteHistoryTable.jsx';
import DeleteDetailsDrawer from '../components/data-management/DeleteDetailsDrawer.jsx';
import StartDeleteModal from '../components/data-management/StartDeleteModal.jsx';
import RestoreBackupModal from '../components/backup/RestoreBackupModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getTablesMetadata } from '../api/backup.js';

export default function DataManagementPage() {
  const { hasPermission } = useAuth();
  // Every /api/admin/data-management/* route requires admin.data-management.manage
  // — no separate view-only permission, so lacking .manage means no access
  // to the page at all, same reasoning as BackupRestorePage.jsx.
  const canAccess = hasPermission('admin.data-management.manage');

  const [tables, setTables] = useState([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [startOpen, setStartOpen] = useState(false);
  const [detailsId, setDetailsId] = useState(null);
  const [restoreJob, setRestoreJob] = useState(null);

  useEffect(() => {
    if (!canAccess) return;
    getTablesMetadata().then(setTables).catch(() => setTables([]));
  }, [canAccess]);

  function bumpRefresh() {
    setRefreshSignal((n) => n + 1);
  }

  if (!canAccess) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access denied"
        description='This page requires the "admin.data-management.manage" permission, which your account does not hold.'
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Data Management"
        description="Delete records, tables, modules, or a selected set of tables — every delete is automatically backed up first and fully reversible from Backup History."
        action={
          <Button variant="danger-solid" icon={Trash2} onClick={() => setStartOpen(true)}>Start Delete</Button>
        }
      />

      <DeleteHistoryTable refreshSignal={refreshSignal} onViewDetails={(job) => setDetailsId(job.id)} />

      <DeleteDetailsDrawer
        deleteJobId={detailsId}
        onClose={() => setDetailsId(null)}
        onRestoreBackup={(backupJob) => setRestoreJob(backupJob)}
      />

      <StartDeleteModal
        open={startOpen}
        tables={tables}
        onClose={() => setStartOpen(false)}
        onDone={bumpRefresh}
      />

      <RestoreBackupModal
        open={!!restoreJob}
        presetJob={restoreJob}
        onClose={() => setRestoreJob(null)}
        onDone={() => { setRestoreJob(null); bumpRefresh(); }}
      />
    </div>
  );
}
