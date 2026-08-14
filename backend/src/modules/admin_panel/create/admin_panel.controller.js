import prisma from '../../../db.js';
import { getMeta, redact } from '../get/admin_panel.controller.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';

export const createRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });
  try {
    const record = await prisma[meta.model].create({ data: req.body });
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: meta.model, recordId: JSON.stringify(record[Array.isArray(meta.idField) ? meta.idField[0] : meta.idField]), newValue: redact(req.params.resource, req.body) });
    return res.status(201).json({ success: true, data: redact(req.params.resource, record) });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}
