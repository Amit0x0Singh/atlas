import prisma from "../../../../db.js";
import { toSafeErrorMessage } from "../../../../utils/safe-error.js";
import { writeAudit, auditUser } from "../../../../middleware/audit.js";

// ── PUT /api/erp/sales-orders/:id  ───────────────────────────────────────
// Updates header-level fields only (not line items)

const updateSalesOrder = async (req, res) => {
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

  try {
    const existing = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        ...(company             !== undefined && { company }),
        ...(diNo                !== undefined && { diNo }),
        ...(customerName        !== undefined && { customerName }),
        ...(orderType           !== undefined && { orderType }),
        ...(priority            !== undefined && { priority }),
        ...(orderReceivedDate   !== undefined && { orderReceivedDate: new Date(orderReceivedDate) }),
        ...(estimatedDispatchDate !== undefined && { estimatedDispatchDate: new Date(estimatedDispatchDate) }),
        ...(invoiceNo           !== undefined && { invoiceNo:     invoiceNo     || null }),
        ...(invoiceDate         !== undefined && { invoiceDate:   invoiceDate   ? new Date(invoiceDate) : null }),
        ...(transportName       !== undefined && { transportName: transportName || null }),
        ...(salesStaff          !== undefined && { salesStaff:    salesStaff    || null }),
        ...(dispatchedBy        !== undefined && { dispatchedBy:  dispatchedBy  || null }),
        ...(remarks             !== undefined && { remarks:       remarks       || null }),
      },
      include: { items: { orderBy: { lineNo: "asc" } } },
    });
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'sales', tableName: 'sales_orders', recordId: order.id, oldValue: existing, newValue: order });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
};

// ── PATCH /api/erp/sales-orders/item/:itemId  ────────────────────────────
// Updates a single line item (including status progression)

const updateSalesOrderItem = async (req, res) => {
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
    "unitsPerCS",
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
      if (["totalQty", "unitQty", "mrp"].includes(key) && req.body[key] !== null)
        data[key] = parseFloat(req.body[key]);
      else if (["totalCS", "unitsPerCS"].includes(key) && req.body[key] !== null)
        data[key] = parseInt(req.body[key]);
      else if (["mfgDate", "expDate"].includes(key))
        data[key] = req.body[key] ? new Date(req.body[key]) : null;
      else
        data[key] = req.body[key] || null;
    }
  }

  try {
    const existing = await prisma.salesOrderItem.findUnique({ where: { id: req.params.itemId } });
    const item = await prisma.salesOrderItem.update({
      where: { id: req.params.itemId },
      data,
    });
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'sales', tableName: 'sales_order_items', recordId: item.id, oldValue: existing, newValue: item });
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
};

// ── PATCH /api/erp/sales-orders/cancel/:id  ──────────────────────────────
// Marks all items on an order as CANCELLED (soft cancel — order row stays)

const cancelOrder = async (req, res) => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
    });
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found", code: 'NOT_FOUND' });

    await prisma.salesOrderItem.updateMany({
      where:  { salesOrderId: req.params.id },
      data:   { status: "CANCELLED" },
    });

    await writeAudit({ ...auditUser(req), action: 'CANCEL', module: 'sales', tableName: 'sales_orders', recordId: order.id, oldValue: order, notes: 'all items marked CANCELLED' });
    return res.json({ success: true, message: "Order items marked as cancelled" });
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
};

// ── PATCH /api/erp/sales-orders/dispatch/:id  ────────────────────────────
// Records dispatch details when an order is shipped out

const dispatchOrder = async (req, res) => {
  const {
    invoiceNo,
    invoiceDate,
    transportName,
    salesStaff,
    dispatchedBy,
    dispatchRemarks,
  } = req.body;

  try {
    const existing = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        ...(invoiceNo       !== undefined && { invoiceNo:     invoiceNo     || null }),
        ...(invoiceDate     !== undefined && { invoiceDate:   invoiceDate   ? new Date(invoiceDate) : null }),
        ...(transportName   !== undefined && { transportName: transportName || null }),
        ...(salesStaff      !== undefined && { salesStaff:    salesStaff    || null }),
        ...(dispatchedBy    !== undefined && { dispatchedBy:  dispatchedBy  || null }),
        ...(dispatchRemarks !== undefined && { remarks:       dispatchRemarks || null }),
      },
      include: { items: { orderBy: { lineNo: "asc" } } },
    });
    await writeAudit({ ...auditUser(req), action: 'DISPATCH', module: 'sales', tableName: 'sales_orders', recordId: order.id, oldValue: existing, newValue: order });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
};

// ── POST /api/erp/sales-orders/item/:itemId/dispatch  ────────────────────
// Records ONE dispatch transaction against ONE line item — the real,
// quantity-aware dispatch path. Dispatched in Secondary Pack COUNT
// (totalCS — how many boxes/cartons were ordered), not the line's KG total:
// the warehouse counts packs off the shelf at dispatch time, it doesn't
// re-weigh material that was already weighed and packed during production.
// totalCS itself is never touched; how many packs have gone out is
// SUM(qty) across every dispatch row for that item, so the same product
// line can be dispatched several times (different days, different partial
// pack counts) fully independently of every other line on the same DI.
// `status` only flips to DISPATCHED once the running total actually
// reaches totalCS — everything is recomputed from the dispatch rows inside
// one transaction, never trusted from the client, so two people dispatching
// the same line at once can't push it over the ordered pack count.
const dispatchSalesOrderItem = async (req, res) => {
  const { itemId } = req.params;
  const { qty, invoiceNo, invoiceDate, transportName, dispatchedBy, remarks } = req.body;

  const entered = parseFloat(qty);
  if (!qty || isNaN(entered) || entered <= 0)
    return res.status(400).json({ success: false, error: "qty must be a positive number", code: 'VALIDATION_ERROR' });
  if (!Number.isInteger(entered))
    return res.status(400).json({ success: false, error: "qty must be a whole number of secondary packs", code: 'VALIDATION_ERROR' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.salesOrderItem.findUnique({
        where: { id: itemId },
        include: { dispatches: true },
      });
      if (!item) {
        const e = new Error("Line item not found"); e.status = 404; e.code = 'NOT_FOUND'; throw e;
      }
      if (item.status === "DISPATCHED") {
        const e = new Error("This line is already fully dispatched"); e.status = 400; e.code = 'ALREADY_DISPATCHED'; throw e;
      }
      if (item.status !== "IN_INVENTORY") {
        const e = new Error(`Line must be in Inventory status before it can be dispatched (currently ${item.status})`);
        e.status = 400; e.code = 'VALIDATION_ERROR'; throw e;
      }
      if (!item.totalCS || item.totalCS <= 0) {
        const e = new Error("This line has no Secondary Pack quantity (Total CS) set — set it before dispatching");
        e.status = 400; e.code = 'VALIDATION_ERROR'; throw e;
      }

      const alreadyDispatched = item.dispatches.reduce((s, d) => s + Number(d.qty), 0);
      const remaining = item.totalCS - alreadyDispatched;
      if (entered > remaining + 0.0009) {
        const e = new Error(`Dispatch qty (${entered} packs) exceeds remaining qty (${remaining} packs)`);
        e.status = 400; e.code = 'VALIDATION_ERROR'; throw e;
      }

      const dispatch = await tx.salesOrderItemDispatch.create({
        data: {
          salesOrderItemId: itemId,
          qty: entered,
          uom: "NOS",
          invoiceNo:     invoiceNo     || null,
          invoiceDate:   invoiceDate   ? new Date(invoiceDate) : null,
          transportName: transportName || null,
          dispatchedBy:  dispatchedBy  || null,
          remarks:       remarks       || null,
        },
      });

      const dispatchedQty = alreadyDispatched + entered;
      const remainingQty  = Math.max(0, item.totalCS - dispatchedQty);
      const isFullyDispatched = remainingQty <= 0.0009;

      const updatedItem = isFullyDispatched
        ? await tx.salesOrderItem.update({ where: { id: itemId }, data: { status: "DISPATCHED" } })
        : item;

      return { dispatch, item: { ...updatedItem, dispatchedQty, remainingQty } };
    });

    await writeAudit({
      ...auditUser(req), action: 'DISPATCH_ITEM', module: 'sales', tableName: 'sales_order_item_dispatch',
      recordId: result.dispatch.id, newValue: result.dispatch,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message, code: err.code });
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
};

export { updateSalesOrder, updateSalesOrderItem, cancelOrder, dispatchOrder, dispatchSalesOrderItem };
