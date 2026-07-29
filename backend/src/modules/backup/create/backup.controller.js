import prisma from '../../../db.js';
import { auditUser } from '../../../middleware/audit.js';
import { MODELS } from '../../admin_panel/get/admin_panel.controller.js';
import { expandForCascades } from '../utils/backup-order.js';
import { runBackupExport } from '../services/backup-export.service.js';

const ALL_TABLES = Object.values(MODELS).map((m) => m.model);
const MODEL_BY_TABLE = new Map(Object.values(MODELS).map((m) => [m.model, m]));
const VALID_TYPES = new Set(['FULL', 'MODULE', 'SELECTED']);

export const createBackup = async (req, res) => {
  const { name, type, modules, tables } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Backup name is required.' });
  }
  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ success: false, error: 'type must be FULL, MODULE, or SELECTED.' });
  }

  let resolvedTables;
  let resolvedModules = [];

  if (type === 'FULL') {
    resolvedTables = ALL_TABLES;
  } else if (type === 'MODULE') {
    if (!Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ success: false, error: 'modules must be a non-empty array for a Module backup.' });
    }
    resolvedModules = modules;
    resolvedTables = Object.values(MODELS)
      .filter((m) => modules.includes(m.group))
      .map((m) => m.model);
    if (resolvedTables.length === 0) {
      return res.status(400).json({ success: false, error: 'No tables found for the given module(s).' });
    }
  } else {
    if (!Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ success: false, error: 'tables must be a non-empty array for a Selected-Tables backup.' });
    }
    const unknown = tables.filter((t) => !MODEL_BY_TABLE.has(t));
    if (unknown.length) {
      return res.status(400).json({ success: false, error: `Unknown table(s): ${unknown.join(', ')}` });
    }
    resolvedTables = tables;
  }

  resolvedTables = expandForCascades(resolvedTables);

  const { userId, username, ip } = auditUser(req);

  const job = await prisma.backupJob.create({
    data: {
      name: name.trim(),
      type,
      tables: resolvedTables,
      modules: resolvedModules,
      tableCount: resolvedTables.length,
      tablesTotal: resolvedTables.length,
      createdBy: userId,
      createdByName: req.user?.full_name || username,
    },
  });

  res.status(202).json({ success: true, data: { id: job.id } });

  // Fire-and-forget — the export runs after the response has already gone
  // out; progress is polled off the BackupJob row via GET /:id/status.
  // AuditLog.userId is a @db.Uuid column but this app's user_id is always an
  // email (see GateInward.createdBy's own comment on the same constraint) —
  // passing it would crash every writeAudit() call, so attribute by
  // username only, same as the app's existing LOGIN audit entries do.
  runBackupExport(job.id, { tables: resolvedTables, auditCtx: { username, ip } }).catch((err) => {
    console.error('[BACKUP EXPORT ERROR]', err);
  });
};
