import prisma from '../../../db.js';
import { auditUser } from '../../../middleware/audit.js';
import { resolveDeleteScope, computeImpact } from '../utils/delete-impact.js';
import { runDeleteExecution } from '../services/delete-execution.service.js';

export const createDelete = async (req, res) => {
  const { deleteType, table, ids, modules, tables, remarks } = req.body ?? {};

  let scope;
  let impact;
  try {
    // Never trust a client-supplied count — re-resolve and re-count here.
    scope = resolveDeleteScope({ deleteType, table, ids, modules, tables });
    impact = await computeImpact(scope);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }

  if (impact.recordCount === 0) {
    return res.status(400).json({ success: false, error: 'Nothing to delete — the selected scope has no rows.', code: 'VALIDATION_ERROR' });
  }

  const { userId, username, ip } = auditUser(req);

  const job = await prisma.deleteJob.create({
    data: {
      deleteType,
      tables: scope.scopeTables,
      modules: modules ?? [],
      recordScope: deleteType === 'RECORD' ? { table, ids } : undefined,
      tablesTotal: scope.scopeTables.length,
      deletedBy: userId,
      deletedByName: req.user?.full_name || username,
      remarks: remarks || null,
    },
  });

  res.status(202).json({ success: true, data: { id: job.id } });

  runDeleteExecution(job.id, {
    tables: scope.scopeTables,
    whereByTable: scope.whereByTable,
    auditCtx: { username, ip },
  }).catch((err) => {
    console.error('[DELETE EXECUTION ERROR]', err);
  });
};
