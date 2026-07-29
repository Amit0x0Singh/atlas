import prisma from '../../../db.js';
import { writeAudit } from '../../../middleware/audit.js';
import { deleteOrderFor } from '../../backup/utils/backup-order.js';
import { runBackupExport } from '../../backup/services/backup-export.service.js';

// Orchestrates one delete: back up the affected data FIRST and confirm it
// actually succeeded, only then run the transactional delete. If the backup
// fails for any reason, the delete never runs — no exceptions.
export async function runDeleteExecution(deleteJobId, { tables, whereByTable, auditCtx }) {
  await prisma.deleteJob.update({ where: { id: deleteJobId }, data: { status: 'BACKING_UP' } });

  const hasFilter = whereByTable && Object.keys(whereByTable).length > 0;
  const backupJob = await prisma.backupJob.create({
    data: {
      name: `Auto-backup before delete (${deleteJobId})`,
      type: 'SELECTED',
      scope: hasFilter ? 'PARTIAL' : 'FULL',
      tables,
      tableCount: tables.length,
      tablesTotal: tables.length,
      createdBy: auditCtx.username,
      createdByName: auditCtx.username,
    },
  });

  // runBackupExport never throws — on internal failure it catches its own
  // error, sets status:'FAILED' on the row, and returns normally. Checking
  // the row's status after awaiting is the only reliable success signal.
  await runBackupExport(backupJob.id, { tables, auditCtx, whereByTable: hasFilter ? whereByTable : undefined });

  const finishedBackup = await prisma.backupJob.findUnique({ where: { id: backupJob.id } });
  if (finishedBackup.status !== 'COMPLETED') {
    await prisma.deleteJob.update({
      where: { id: deleteJobId },
      data: {
        status: 'FAILED',
        backupJobId: backupJob.id,
        errorMessage: `Automatic backup failed — delete aborted: ${finishedBackup.errorMessage ?? 'unknown error'}`,
      },
    });
    await writeAudit({
      ...auditCtx,
      action: 'DELETE',
      tableName: tables.join(','),
      recordId: deleteJobId,
      notes: `Delete aborted — automatic backup failed: ${finishedBackup.errorMessage ?? 'unknown error'}`,
    });
    return;
  }

  await prisma.deleteJob.update({
    where: { id: deleteJobId },
    data: { status: 'DELETING', backupJobId: backupJob.id, tablesTotal: tables.length, tablesDone: 0 },
  });

  const deleteOrder = deleteOrderFor(tables);
  let recordCount = 0;
  const tableBreakdown = {};

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const table of deleteOrder) {
          const where = whereByTable?.[table];
          // eslint-disable-next-line no-await-in-loop
          const result = await tx[table].deleteMany(where ? { where } : {});
          recordCount += result.count;
          tableBreakdown[table] = result.count;
          // Progress via the plain client (not `tx`) so pollers see it live,
          // same pattern already established in backup-restore.service.js.
          // eslint-disable-next-line no-await-in-loop
          await prisma.deleteJob.update({
            where: { id: deleteJobId },
            data: { tablesDone: { increment: 1 }, currentTable: table, recordCount, tableBreakdown },
          });
        }
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    await prisma.deleteJob.update({
      where: { id: deleteJobId },
      data: { status: 'COMPLETED', currentTable: null, completedAt: new Date() },
    });

    await writeAudit({
      ...auditCtx,
      action: 'DELETE',
      tableName: tables.join(','),
      recordId: deleteJobId,
      notes: `Delete completed — ${tables.length} table(s), ${recordCount} record(s). Backup: ${backupJob.id}`,
    });
  } catch (err) {
    // Postgres FK violation (if the admin proceeded past an external-
    // reference warning and it was actually enforced) surfaces here
    // verbatim — the transaction has already rolled back automatically.
    // The backup created above is NOT rolled back — it's a separate,
    // already-committed safeguard, which is correct: a failed delete still
    // leaves the admin with a valid, restorable backup.
    await prisma.deleteJob.update({
      where: { id: deleteJobId },
      data: { status: 'FAILED', errorMessage: err.message },
    });
    await writeAudit({
      ...auditCtx,
      action: 'DELETE',
      tableName: tables.join(','),
      recordId: deleteJobId,
      notes: `Delete FAILED: ${err.message}`,
    });
  }
}
