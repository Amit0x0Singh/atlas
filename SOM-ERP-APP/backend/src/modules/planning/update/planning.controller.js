// ─── GET /planner-queue — confirmed orders within planning horizon ─────────
//   fastify.get("/planner-queue", { preHandler: plannerOrAbove }, async (req) => {

const getPlannerQueue = async (req) => {
  const horizonDays = Number(req.query.horizon || 3);
  const horizonDate = new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const data = await prisma.$queryRaw`
      SELECT so.*, ep.is_microbial, ep.consolidation_window_days, ep.plant_id,
             pp.plan_id, pp.status AS plan_status
      FROM sales_orders so
      LEFT JOIN erp_products ep ON ep.product_code = so.product_code
      LEFT JOIN production_plans pp ON pp.di_number = so.di_number AND pp.status != 'cancelled'
      WHERE so.status = 'confirmed'
        AND so.etd <= ${horizonDate}::date
      ORDER BY so.priority DESC, so.etd ASC
    `;
  return { success: true, data };
};
