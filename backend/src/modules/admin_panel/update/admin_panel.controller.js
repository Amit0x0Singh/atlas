import prisma from '../../../db.js';
import { getMeta, buildWhere, redact } from '../get/admin_panel.controller.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';

export const updateRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const where  = buildWhere(meta, req.params);
    const record = await prisma[meta.model].update({ where, data: req.body });
    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: meta.model, recordId: JSON.stringify(req.params.id || `${req.params.p1}/${req.params.p2}`), newValue: redact(req.params.resource, req.body) });
    return res.json({ success: true, data: redact(req.params.resource, record) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}
