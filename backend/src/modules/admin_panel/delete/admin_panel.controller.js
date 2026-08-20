import prisma from '../../../db.js';
import { getMeta, buildWhere } from '../get/admin_panel.controller.js';
import { redactSecretFields, idDisplay } from '../shared/field-guard.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';
import { toSafeErrorMessage } from '../../../utils/safe-error.js';

export const deleteRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const where = buildWhere(meta, req.params);
    const existing = await prisma[meta.model].findUnique({ where });
    await prisma[meta.model].delete({ where });
    await writeAudit({
      ...auditUser(req),
      action: 'DELETE',
      tableName: meta.model,
      recordId: existing ? idDisplay(meta, existing) : undefined,
      oldValue: existing ? redactSecretFields(meta, existing) : undefined,
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(err), code: 'VALIDATION_ERROR' });
  }
}

// Wipes an entire table in one request — the single most powerful (and
// previously least-audited) endpoint in the admin panel.
export const deleteAllRecords = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const result = await prisma[meta.model].deleteMany({});
    await writeAudit({
      ...auditUser(req),
      action: 'DELETE_ALL',
      tableName: meta.model,
      notes: `Deleted all ${result.count} row(s) from ${meta.model} via admin panel.`,
    });
    return res.json({ success: true, deleted: result.count });
  } catch (err) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(err), code: 'VALIDATION_ERROR' });
  }
}
