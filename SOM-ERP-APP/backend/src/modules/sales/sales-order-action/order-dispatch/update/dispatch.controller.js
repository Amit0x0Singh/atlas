
// ── PATCH /api/erp/sales-orders/dispatch/:id  ────────────────────────────
// 1. Fill dispatch details on an existing order (invoice, transport, staff, etc.)
// 2. Kept separate from the main PUT so the create/edit form stays clean.

//   fastify.patch("/dispatch/:id", async (req, reply) => {
const updateSalesOrderDispatch = async (req, reply) => {
  const {
    invoiceNo,
    invoiceDate,
    transportName,
    salesStaff,
    dispatchedBy,
    dispatchRemarks,
  } = req.body;
  const order = await prisma.salesOrder.update({
    where: { id: req.params.id },
    data: {
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
      ...(dispatchRemarks !== undefined && {
        remarks: dispatchRemarks || null,
      }),
    },
    include: { items: { orderBy: { lineNo: "asc" } } },
  });
  return { success: true, data: order };
};



// -------------------------------- POST /orders/:di/dispatch — Record dispatch

// When goods physically leave the warehouse, the store manager records the invoice number,
// transport details and dispatch date here.It also automatically updates the order status to dispatched.

// fastify.post(
//   "/orders/:di/dispatch",
//   { preHandler: authorize(["admin", "store_manager", "planning_manager"]) },
//   async (req, reply) => {
const dispatchOrder = async (req, reply) => {
    const {
      invoice_number,
      invoice_date,
      transport_name,
      dispatched_by,
      dispatch_date,
      dispatch_notes,
    } = req.body || {};
    if (!invoice_number)
      return reply
        .status(400)
        .send({ success: false, error: "invoice_number required" });

    const rows = await prisma.$queryRaw`
      INSERT INTO order_dispatch (di_number, invoice_number, invoice_date, transport_name,
        dispatched_by, dispatch_date, dispatch_notes)
      VALUES (${req.params.di}, ${invoice_number}, ${invoice_date || null}::date,
              ${transport_name || null}, ${req.user?.user_id || null}::uuid,
              ${dispatch_date || null}::date, ${dispatch_notes || null})
      RETURNING *
    `;
    await prisma.$executeRaw`
      UPDATE sales_orders SET status = 'dispatched', updated_at = NOW() WHERE di_number = ${req.params.di}
    `;
    await writeAudit({
      ...auditUser(req),
      action: "DISPATCH",
      tableName: "order_dispatch",
      recordId: rows[0].dispatch_id,
      newValue: req.body,
    });
    return reply.status(201).send({ success: true, data: rows[0] });
  },
