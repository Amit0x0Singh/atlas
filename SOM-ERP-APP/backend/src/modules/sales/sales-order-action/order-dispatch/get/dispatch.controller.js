// ─── GET dispatch records ─────────────────────────────────────────────────
//  GET /dispatch — List all dispatch records
//  Returns a history of all dispatched orders with customer name,
//  product name, invoice details and who dispatched it.

// fastify.get("/dispatch", { preHandler: authenticate }, async (req) => {
const listDispatchRecords = async (req) => {
  const { from, to, limit = 100, offset = 0 } = req.query;
  const data = await prisma.$queryRaw`
      SELECT od.*, so.customer_name, so.product_name, so.order_qty, so.qty_unit,
             u.full_name AS dispatched_by_name
      FROM order_dispatch od
      JOIN sales_orders so ON so.di_number = od.di_number
      LEFT JOIN users u ON u.user_id = od.dispatched_by
      WHERE (${from || null}::date IS NULL OR od.dispatch_date >= ${from || null}::date)
        AND (${to || null}::date IS NULL OR od.dispatch_date <= ${to || null}::date)
      ORDER BY od.dispatch_date DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
  return { success: true, data };
};
