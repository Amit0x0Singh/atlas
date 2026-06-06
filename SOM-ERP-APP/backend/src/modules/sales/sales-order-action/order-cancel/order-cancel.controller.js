// ─── PATCH :di/cancel — mark cancelled (never delete) ────────────────────

// PATCH /orders/:di/cancel — Cancel an order
// Marks the order as cancelled.Only admins and planning managers can do this.
// Notice it never deletes — it just changes the status.This preserves the full audit history.
 
//   fastify.patch(
//     "/orders/:di/cancel",
//     { preHandler: authorize(["admin", "planning_manager"]) },
//     async (req, reply) => {

 const cancelOrder = async (req, reply) => {
      await prisma.$executeRaw`
      UPDATE sales_orders SET status = 'cancelled', updated_at = NOW() WHERE di_number = ${req.params.di}
    `;
      await writeAudit({
        ...auditUser(req),
        action: "CANCEL",
        tableName: "sales_orders",
        recordId: req.params.di,
      });
      return { success: true, message: "Order marked cancelled (not deleted)" };
    },
