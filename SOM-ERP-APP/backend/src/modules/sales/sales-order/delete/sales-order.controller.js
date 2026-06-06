// ── DELETE /api/erp/sales-orders/:id  ────────────────────────────────────

// fastify.delete("/:id", async (req) => {

const deleteSalesOrder = async (req) => {
  await prisma.salesOrder.delete({ where: { id: req.params.id } });
  return { success: true };
};

// ── DELETE /api/erp/sales-orders/item/:itemId  ───────────────────────────

//   fastify.delete("/item/:itemId", async (req) => {
const deleteSalesOrderItem = async (req) => {
  await prisma.salesOrderItem.delete({ where: { id: req.params.itemId } });
  return { success: true };
};
