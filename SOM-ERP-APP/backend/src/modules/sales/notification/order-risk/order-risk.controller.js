// ─── GET at-risk orders (ETD ≤ 7 days, not dispatched) ───────────────────

// router: '/orders/at-risk'

const getAtRiskOrders = async () => {
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const data = await prisma.$queryRaw`
      SELECT * FROM sales_orders
      WHERE etd <= ${sevenDaysOut}::date
        AND etd >= ${today}::date
        AND status NOT IN ('dispatched', 'cancelled')
      ORDER BY etd ASC, priority DESC
    `;

  return { success: true, data };
};
