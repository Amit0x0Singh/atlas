import prisma from "../../../../db.js";
import { writeAudit, auditUser } from "../../../../middleware/audit.js";

// ── DELETE /api/erp/sales-orders/:id  ────────────────────────────────────
// Permanently deletes an order and all its line items (cascade)

const deleteSalesOrder = async (req, res) => {
  try {
    const deleted = await prisma.salesOrder.delete({ where: { id: req.params.id } });
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'sales', tableName: 'sales_orders', recordId: req.params.id, oldValue: deleted });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

// ── DELETE /api/erp/sales-orders/item/:itemId  ───────────────────────────
// Permanently deletes a single line item from an order

const deleteSalesOrderItem = async (req, res) => {
  try {
    const deleted = await prisma.salesOrderItem.delete({ where: { id: req.params.itemId } });
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'sales', tableName: 'sales_order_items', recordId: req.params.itemId, oldValue: deleted });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

export { deleteSalesOrder, deleteSalesOrderItem };
