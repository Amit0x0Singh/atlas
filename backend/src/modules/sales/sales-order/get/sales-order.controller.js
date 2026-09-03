import prisma from "../../../../db.js";
import { toSafeErrorMessage } from "../../../../utils/safe-error.js";

// Attaches computed dispatchedQty/remainingQty to every item (never stored —
// always derived from the item's own dispatch rows, so it can't drift out
// of sync with the history it's summarizing). Dispatch is tracked in
// Secondary Pack COUNT (totalCS), not the line's KG total — see
// dispatchSalesOrderItem's comment. A line with no totalCS set yet has
// nothing to dispatch against, so remainingQty comes back `null` (meaning
// "not configured for dispatch") rather than 0 ("fully dispatched") — the
// two must never look the same to the frontend's dispatch-eligibility check.
// `item.status` alone still tells the rest of the app "can this be
// dispatched at all" (IN_INVENTORY) and "is it completely done"
// (DISPATCHED); these two just add "how many packs, exactly" on top for
// partial dispatch to work.
function withDispatchTotals(item) {
  const dispatchedQty = (item.dispatches || []).reduce((s, d) => s + Number(d.qty), 0);
  const remainingQty = item.totalCS ? Math.max(0, item.totalCS - dispatchedQty) : null;
  return { ...item, dispatchedQty, remainingQty };
}
function withOrderDispatchTotals(order) {
  return { ...order, items: (order.items || []).map(withDispatchTotals) };
}
const itemsInclude = {
  orderBy: { lineNo: "asc" },
  include: { dispatches: { orderBy: { dispatchedAt: "desc" } } },
};

// ── GET /api/erp/sales-orders ─────────────────────────────────────────────────
// Query params: company, status, priority, diNo, search, from, to, limit, offset

const getSalesOrders = async (req, res) => {
  const {
    company,
    status,
    priority,
    diNo,
    search,
    from,
    to,
    limit = 200,
    offset = 0,
  } = req.query;

  const where = {};
  // company is stored lowercase (RULES.LOWER) — match case-insensitively so
  // this still works regardless of what case the caller passes.
  if (company) where.company = { equals: company, mode: "insensitive" };
  if (priority) where.priority = priority;
  if (diNo) where.diNo = { contains: diNo, mode: "insensitive" };
  if (search) where.customerName = { contains: search, mode: "insensitive" };

  if (from || to) {
    where.estimatedDispatchDate = {};
    if (from) where.estimatedDispatchDate.gte = new Date(from);
    if (to) where.estimatedDispatchDate.lte = new Date(to);
  }

  // status lives on items, not the header — filter orders that have at least one matching item
  if (status) {
    where.items = { some: { status } };
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: { items: itemsInclude },
      orderBy: [{ priority: "asc" }, { estimatedDispatchDate: "asc" }],
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return res.json({ success: true, data: orders.map(withOrderDispatchTotals), total });
};

// ── GET /api/erp/sales-orders/:id  ───────────────────────────────────────

const getSalesOrderById = async (req, res) => {
  const order = await prisma.salesOrder.findUnique({
    where: { id: req.params.id },
    include: { items: itemsInclude },
  });

  if (!order)
    return res.status(404).json({ success: false, error: "Order not found", code: 'NOT_FOUND' });

  return res.json({ success: true, data: withOrderDispatchTotals(order) });
};

// ── GET /api/erp/sales-orders/summary/dashboard  ─────────────────────────
// Quick counts per status for a dashboard widget

const getDashboardSummary = async (req, res) => {
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

  return res.json({
    success: true,
    data: { statusCounts: counts, urgentPending },
  });
};

// GET /api/erp/sales-orders/companies
const getCompanies = async (req, res) => {
  try {
    const companies = await prisma.companyMaster.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { code: true, name: true },
    });
    return res.json({ success: true, data: companies });
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
};

// ── GET /api/erp/sales-orders/sync-log  ──────────────────────────────────
// Last 20 sheet sync attempts

const getSyncLogs = async (req, res) => {
  const logs = await prisma.sheetSyncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return res.json({ success: true, data: logs });
};

export {
  getSalesOrders,
  getSalesOrderById,
  getDashboardSummary,
  getSyncLogs,
  getCompanies,
};
