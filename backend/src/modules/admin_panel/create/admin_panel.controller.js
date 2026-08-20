import prisma from '../../../db.js';
import { getMeta } from '../get/admin_panel.controller.js';
import { sanitizeWriteBody, redactSecretFields, idDisplay } from '../shared/field-guard.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';
import { toSafeErrorMessage } from '../../../utils/safe-error.js';

export const createRecord = async (req, res) => {
  const meta = getMeta(req.params.resource);
  if (!meta) return res.status(404).json({ success: false, error: 'Unknown resource', code: 'NOT_FOUND' });

  const { data, rejectedKeys } = sanitizeWriteBody(meta, req.body, { isUpdate: false });
  if (rejectedKeys.length) {
    return res.status(400).json({
      success: false,
      error: `Unknown or disallowed field(s): ${rejectedKeys.join(', ')}`,
      code: 'VALIDATION_ERROR',
    });
  }

  try {
    const record = await prisma[meta.model].create({ data });
    const safe = redactSecretFields(meta, record);
    await writeAudit({
      ...auditUser(req),
      action: 'CREATE',
      tableName: meta.model,
      recordId: idDisplay(meta, record),
      newValue: safe,
    });
    return res.status(201).json({ success: true, data: safe });
  } catch (err) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(err), code: 'VALIDATION_ERROR' });
  }
}
