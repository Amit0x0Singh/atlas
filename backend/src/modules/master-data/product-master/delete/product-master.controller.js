import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const deleteProduct = async (req, res) => {
  try {
    const deleted = await prisma.productMaster.delete({ where: { productCode: req.params.productCode } })
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'masters', tableName: 'product_master', recordId: deleted.productCode, oldValue: deleted })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
