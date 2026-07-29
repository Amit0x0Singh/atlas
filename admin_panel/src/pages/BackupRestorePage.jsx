import { useEffect, useState } from 'react';
import { DatabaseBackup, RotateCcw } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import Button from '../components/common/Button.jsx';
import DeleteDialog from '../components/common/DeleteDialog.jsx';
import BackupHistoryTable from '../components/backup/BackupHistoryTable.jsx';
import BackupDetailsDrawer from '../components/backup/BackupDetailsDrawer.jsx';
import CreateBackupModal from '../components/backup/CreateBackupModal.jsx';
import RestoreBackupModal from '../components/backup/RestoreBackupModal.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getTablesMetadata, deleteBackup } from '../api/backup.js';

export default function BackupRestorePage() {
  const showToast = useToast();
  const { isReadOnly } = useAuth();

  const [tables, setTables] = useState([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restorePreset, setRestorePreset] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getTablesMetadata().then(setTables).catch(() => setTables([]));
  }, []);

  function bumpRefresh() {
    setRefreshSignal((n) => n + 1);
  }

  function openRestoreFor(job) {
    setRestorePreset(job);
    setRestoreOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBackup(deleteTarget.id);
      showToast('Backup deleted.');
      if (detailsId === deleteTarget.id) setDetailsId(null);
      setDeleteTarget(null);
      bumpRefresh();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Unable to delete backup.', 'danger');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Backup & Restore"
        description="Create full, module-wise, or selected-table backups, and restore data from a previous backup or an uploaded file."
        action={
          !isReadOnly && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={RotateCcw} onClick={() => { setRestorePreset(null); setRestoreOpen(true); }}>
                Restore Backup
              </Button>
              <Button icon={DatabaseBackup} onClick={() => setCreateOpen(true)}>Create Backup</Button>
            </div>
          )
        }
      />

      <BackupHistoryTable
        refreshSignal={refreshSignal}
        onViewDetails={(job) => setDetailsId(job.id)}
        onRestore={openRestoreFor}
      />

      <BackupDetailsDrawer
        backupId={detailsId}
        onClose={() => setDetailsId(null)}
        onRestore={openRestoreFor}
        onDelete={(job) => setDeleteTarget(job)}
      />

      <CreateBackupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={bumpRefresh}
        tables={tables}
      />

      <RestoreBackupModal
        open={restoreOpen}
        presetJob={restorePreset}
        onClose={() => setRestoreOpen(false)}
        onDone={bumpRefresh}
      />

      <DeleteDialog
        open={!!deleteTarget}
        title="Delete this backup?"
        message={<>This permanently removes <strong>{deleteTarget?.name}</strong> and its backup file. This cannot be undone.</>}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
