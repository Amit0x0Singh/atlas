import prisma from '../../../db.js';
import { getMeta, buildWhere } from '../get/admin_panel.controller.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';

export const deleteRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const where = buildWhere(meta, req.params);
    await prisma[meta.model].delete({ where });
    await writeAudit({ ...auditUser(req), action: 'DELETE', tableName: meta.model, recordId: JSON.stringify(req.params.id || `${req.params.p1}/${req.params.p2}`) });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}

// The single most destructive endpoint in the app — wipes every row of any
// of ~90 models in one call. Audited unconditionally, including the count
// of what was destroyed.
export const deleteAllRecords = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const result = await prisma[meta.model].deleteMany({});
    await writeAudit({ ...auditUser(req), action: 'DELETE_ALL', tableName: meta.model, notes: `Deleted all ${result.count} row(s)` });
    return res.json({ success: true, deleted: result.count });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}
