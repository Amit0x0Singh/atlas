import prisma from '../../../db.js';
import { getMeta, buildWhere } from '../get/admin_panel.controller.js';
import { sanitizeWriteBody, redactSecretFields, idDisplay } from '../shared/field-guard.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';

export const updateRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });

  const { data, rejectedKeys } = sanitizeWriteBody(meta, req.body, { isUpdate: true });
  if (rejectedKeys.length) {
    return res.status(400).json({
      success: false,
      error: `Unknown or disallowed field(s): ${rejectedKeys.join(', ')}`,
      code: 'VALIDATION_ERROR',
    });
  }

  try {
    const where = buildWhere(meta, req.params);
    const oldRecord = await prisma[meta.model].findUnique({ where });
    const record = await prisma[meta.model].update({ where, data });
    const safe = redactSecretFields(meta, record);
    await writeAudit({
      ...auditUser(req),
      action: 'UPDATE',
      tableName: meta.model,
      recordId: idDisplay(meta, record),
      oldValue: oldRecord ? redactSecretFields(meta, oldRecord) : undefined,
      newValue: safe,
    });
    return res.json({ success: true, data: safe });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}
