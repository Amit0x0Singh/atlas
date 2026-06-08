import prisma from "../db.js";

// Secret token for Google Sheets webhook (set SHEET_WEBHOOK_SECRET in .env)
const WEBHOOK_SECRET =
  process.env.SHEET_WEBHOOK_SECRET || "som-sheet-sync-2024";

// ── Status flow ───────────────────────────────────────────────────────────────
// PENDING → PLANNED → UNDER_PRODUCTION → PACKED → IN_INVENTORY → READY_TO_DISPATCH → DISPATCHED

async function nextSoId() {
  const year = new Date().getFullYear();

  const seq = await prisma.soSequence.upsert({
    where: { year },
    create: { year, seq: 1 },
    update: { seq: { increment: 1 } },
  });

  return `SO-${year}-${String(seq.seq).padStart(4, "0")}`;
}

// ── GET /api/erp/sales-orders ─────────────────────────────────────────────────

// Query: company, status, priority, diNo, search, from, to

const findSalesOrder = async (req, res) => {
  const { company, priority, diNo, search, from, to } = req.query;

  const where = {};
  if (company) where.company = company;
  if (priority) where.priority = priority;
  if (diNo) where.diNo = { contains: diNo, mode: "insensitive" };
  if (search) where.customerName = { contains: search, mode: "insensitive" };

  if (from || to) {
    where.estimatedDispatchDate = {};
    if (from) where.estimatedDispatchDate.gte = new Date(from);
    if (to) where.estimatedDispatchDate.lte = new Date(to);
  }

  const orders = await prisma.salesOrder.findMany({
    where,
    include: { items: { orderBy: { lineNo: "asc" } } },
    orderBy: [{ priority: "asc" }, { estimatedDispatchDate: "asc" }],
  });

  // Express does NOT auto-serialize a returned object — must call res.json()
  return res.json({ success: true, data: orders });
};

// ── GET /api/erp/sales-orders/:id  ───────────────────────────────────────

//  fastify.get("/:id")
const getSalesOrderById = async (req, reply) => {
  const order = await prisma.salesOrder.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { lineNo: "asc" } } },
  });
  if (!order)
    return reply.status(404).send({ success: false, error: "Order not found" });
  return { success: true, data: order };
};

// ─── GET /api/erp/sales/orders ────────────────────────────────────────────

// GET /orders — List all orders with filters
// Fetches all sales orders from the database.The frontend can filter by status,
// priority, product code, and date range.Returns the list plus a total count for pagination.

// fastify.get("/orders", { preHandler: authenticate }, async (req) => {
const getSalesOrders = async (req) => {
  const {
    status,
    priority,
    from_etd,
    to_etd,
    product_code,
    limit = 100,
    offset = 0,
  } = req.query;
  const data = await prisma.$queryRaw`
      SELECT so.*
      FROM sales_orders so
      WHERE (${status || null}::text IS NULL OR so.status = ${status || null})
        AND (${priority || null}::text IS NULL OR so.priority = ${priority || null})
        AND (${product_code || null}::text IS NULL OR so.product_code = ${product_code || null})
        AND (${from_etd || null}::date IS NULL OR so.etd >= ${from_etd || null}::date)
        AND (${to_etd || null}::date IS NULL OR so.etd <= ${to_etd || null}::date)
      ORDER BY so.priority DESC, so.etd ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
  const total =
    await prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM sales_orders`;
  return { success: true, data, total: Number(total[0].cnt) };
};

// ── GET /api/erp/sales-orders/summary/dashboard  ─────────────────────────
// Quick counts per status for a dashboard widget

const getDashboardSummary = async () => {
  const statuses = [
    "PENDING",
    "PLANNED",
    "UNDER_PRODUCTION",
    "PACKED",
    "IN_INVENTORY",
    "READY_TO_DISPATCH",
    "DISPATCHED",
  ];

  const counts = await Promise.all(
    statuses.map((s) =>
      prisma.salesOrderItem
        .count({ where: { status: s } })
        .then((c) => ({ status: s, count: c })),
    ),
  );

  const urgentPending = await prisma.salesOrder.count({
    where: {
      priority: { in: ["URGENT", "VERY_URGENT"] },
      items: { some: { status: { in: ["PENDING", "PLANNED"] } } },
    },
  });

  return { success: true, data: { statusCounts: counts, urgentPending } };
};

// ── GET /api/erp/sales-orders/sync-log  ──────────────────────────────────
// Last 20 sheet sync attempts

const getSyncLogs = async () => {
  const logs = await prisma.sheetSyncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return { success: true, data: logs };
};

export {
  findSalesOrder,
  getSalesOrderById,
  getSalesOrders,
  getDashboardSummary,
  getSyncLogs,
};
