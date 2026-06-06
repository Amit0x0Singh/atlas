// ── PUT /api/erp/sales-orders/:id  ───────────────────────────────────────
// Update header-level fields
const updateSalesOrder = async (req, reply) => {
  const {
    company,
    diNo,
    customerName,
    orderType,
    orderReceivedDate,
    priority,
    estimatedDispatchDate,
    invoiceNo,
    invoiceDate,
    transportName,
    salesStaff,
    dispatchedBy,
    remarks,
  } = req.body;

  const order = await prisma.salesOrder.update({
    where: { id: req.params.id },
    data: {
      ...(company !== undefined && { company }),
      ...(diNo !== undefined && { diNo }),
      ...(customerName !== undefined && { customerName }),
      ...(orderType !== undefined && { orderType }),
      ...(priority !== undefined && { priority }),
      ...(orderReceivedDate !== undefined && {
        orderReceivedDate: new Date(orderReceivedDate),
      }),
      ...(estimatedDispatchDate !== undefined && {
        estimatedDispatchDate: new Date(estimatedDispatchDate),
      }),
      ...(invoiceNo !== undefined && { invoiceNo: invoiceNo || null }),
      ...(invoiceDate !== undefined && {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
      }),
      ...(transportName !== undefined && {
        transportName: transportName || null,
      }),
      ...(salesStaff !== undefined && { salesStaff: salesStaff || null }),
      ...(dispatchedBy !== undefined && {
        dispatchedBy: dispatchedBy || null,
      }),
      ...(remarks !== undefined && { remarks: remarks || null }),
    },
    include: { items: { orderBy: { lineNo: "asc" } } },
  });
  return { success: true, data: order };
};

// ── PATCH /api/erp/sales-orders/item/:itemId  ────────────────────────────
// Update a single line item (including status)

// fastify.patch("/item/:itemId", async (req, reply) => {
const updateSalesOrderItem = async (req, reply) => {
  const allowed = [
    "customerProductName",
    "inhouseProductName",
    "inhouseProductCode",
    "activeSpecs",
    "activeIngredient",
    "carrier",
    "batchNo",
    "sectionName",
    "totalQty",
    "totalUom",
    "unitQty",
    "unitUom",
    "unitPackType",
    "packingType",
    "totalCS",
    "labelType",
    "mrp",
    "mfgDate",
    "expDate",
    "status",
  ];

  const data = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (
        ["totalQty", "unitQty", "mrp"].includes(key) &&
        req.body[key] !== null
      )
        data[key] = parseFloat(req.body[key]);
      else if (key === "totalCS" && req.body[key] !== null)
        data[key] = parseInt(req.body[key]);
      else if (["mfgDate", "expDate"].includes(key))
        data[key] = req.body[key] ? new Date(req.body[key]) : null;
      else data[key] = req.body[key] || null;
    }
  }

  const item = await prisma.salesOrderItem.update({
    where: { id: req.params.itemId },
    data,
  });
  return { success: true, data: item };
};

// ─── PATCH — update order ─────────────────────────────────────────────────

// PATCH /orders/:di — Update an order Updates fields like status, ETD,
// quantity, priority or notes.Has a built -in role check:
//  the sales team can only move an order from new → confirmed.They cannot set it to planned,
//   in_production, or dispatched — those are controlled by the ERP / production system.

// fastify.patch(
//   "/orders/:di",
//   { preHandler: salesOrAbove },
//   async (req, reply) => {

const updateSalesOrder = async (req, reply) => {
  const di = req.params.di;
  const current =
    await prisma.$queryRaw`SELECT * FROM sales_orders WHERE di_number = ${di}`;
  if (!current[0])
    return reply.status(404).send({ success: false, error: "Order not found" });

  const { status, etd, order_qty, priority, notes, ...rest } = req.body || {};

  // Sales team can only set new → confirmed
  if (status && req.user?.role === "sales_team") {
    if (!(current[0].status === "new" && status === "confirmed"))
      return reply.status(403).send({
        success: false,
        error: "Sales team can only move orders from new → confirmed",
      });
  }

  // ERP handles status beyond confirmed
  if (
    status &&
    ["planned", "in_production", "dispatched"].includes(status) &&
    req.user?.role === "sales_team"
  )
    return reply.status(403).send({
      success: false,
      error: "ERP system manages statuses beyond confirmed",
    });

  await prisma.$executeRaw`
      UPDATE sales_orders SET
        status   = COALESCE(${status || null}, status),
        etd      = COALESCE(${etd || null}::date, etd),
        order_qty = COALESCE(${order_qty || null}, order_qty),
        priority = COALESCE(${priority || null}, priority),
        notes    = COALESCE(${notes || null}, notes),
        updated_at = NOW()
      WHERE di_number = ${di}
    `;
  await writeAudit({
    ...auditUser(req),
    action: "UPDATE",
    tableName: "sales_orders",
    recordId: di,
    oldValue: current[0],
    newValue: req.body,
  });

  const updated =
    await prisma.$queryRaw`SELECT * FROM sales_orders WHERE di_number = ${di}`;

  return { success: true, data: updated[0] };
};
