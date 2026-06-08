import prisma from "../../../db.js";

const WEBHOOK_SECRET = process.env.SHEET_WEBHOOK_SECRET || "som-sheet-sync-2024";

async function nextSoId() {
  const year = new Date().getFullYear();
  const seq = await prisma.soSequence.upsert({
    where: { year },
    create: { year, seq: 1 },
    update: { seq: { increment: 1 } },
  });
  return `SO-${year}-${String(seq.seq).padStart(4, "0")}`;
}

// GET /api/erp/sales-orders
export async function listSalesOrders(req, res) {
  try {
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
    return res.json({ success: true, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/erp/sales-orders/summary/dashboard
export async function getDashboardSummary(req, res) {
  try {
    const statuses = [
      "PENDING", "PLANNED", "UNDER_PRODUCTION", "PACKED",
      "IN_INVENTORY", "READY_TO_DISPATCH", "DISPATCHED",
    ];
    const counts = await Promise.all(
      statuses.map((s) =>
        prisma.salesOrderItem.count({ where: { status: s } }).then((c) => ({ status: s, count: c })),
      ),
    );
    const urgentPending = await prisma.salesOrder.count({
      where: {
        priority: { in: ["URGENT", "VERY_URGENT"] },
        items: { some: { status: { in: ["PENDING", "PLANNED"] } } },
      },
    });
    return res.json({ success: true, data: { statusCounts: counts, urgentPending } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/erp/sales-orders/sync-log
export async function getSyncLog(req, res) {
  try {
    const logs = await prisma.sheetSyncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/erp/sales-orders/companies
export async function getCompanies(req, res) {
  try {
    const companies = await prisma.companyMaster.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { code: true, name: true },
    });
    return res.json({ success: true, data: companies });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/erp/sales-orders/:id
export async function getSalesOrderById(req, res) {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { lineNo: "asc" } } },
    });
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/erp/sales-orders
export async function createSalesOrder(req, res) {
  try {
    const {
      company, diNo, customerName, orderType, orderReceivedDate,
      priority, estimatedDispatchDate, invoiceNo, invoiceDate,
      transportName, salesStaff, dispatchedBy, remarks, items,
    } = req.body;

    if (!company || !diNo || !customerName || !orderType)
      return res.status(400).json({
        success: false,
        error: "company, diNo, customerName, orderType are required",
      });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({
        success: false,
        error: "At least one order item is required",
      });

    const soId = await nextSoId();
    const order = await prisma.salesOrder.create({
      data: {
        soId, company, diNo, customerName, orderType,
        orderReceivedDate: orderReceivedDate ? new Date(orderReceivedDate) : new Date(),
        priority: priority || "MODERATE",
        estimatedDispatchDate: estimatedDispatchDate
          ? new Date(estimatedDispatchDate)
          : orderReceivedDate ? new Date(orderReceivedDate) : new Date(),
        invoiceNo: invoiceNo || null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        transportName: transportName || null,
        salesStaff: salesStaff || null,
        dispatchedBy: dispatchedBy || null,
        remarks: remarks || null,
        items: {
          create: items.map((item, idx) => ({
            lineNo: idx + 1,
            customerProductName: item.customerProductName,
            inhouseProductName: item.inhouseProductName || null,
            inhouseProductCode: item.inhouseProductCode || null,
            activeSpecs: item.activeSpecs || null,
            activeIngredient: item.activeIngredient || null,
            carrier: item.carrier || null,
            batchNo: item.batchNo || null,
            sectionName: item.sectionName || null,
            totalQty: parseFloat(item.totalQty),
            totalUom: item.totalUom || "KG",
            unitQty: item.unitQty ? parseFloat(item.unitQty) : null,
            unitUom: item.unitUom || null,
            unitPackType: item.unitPackType || null,
            packingType: item.packingType || null,
            totalCS: item.totalCS ? parseInt(item.totalCS) : null,
            labelType: item.labelType || null,
            mrp: item.mrp ? parseFloat(item.mrp) : null,
            mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
            expDate: item.expDate ? new Date(item.expDate) : null,
            status: "PENDING",
          })),
        },
      },
      include: { items: true },
    });
    return res.status(201).json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/erp/sales-orders/companies
export async function addCompany(req, res) {
  try {
    const { code, name } = req.body;
    if (!code || !name)
      return res.status(400).json({ success: false, error: "code and name are required" });
    const company = await prisma.companyMaster.upsert({
      where: { code: code.trim().toUpperCase() },
      create: { code: code.trim().toUpperCase(), name: name.trim() },
      update: { name: name.trim(), isActive: true },
    });
    return res.json({ success: true, data: company });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/erp/sales-orders/sheet-import
export async function sheetImport(req, res) {
  try {
    const { secret, trigger = "WEBHOOK", rows } = req.body || {};

    if (secret !== WEBHOOK_SECRET)
      return res.status(401).json({ success: false, error: "Invalid webhook secret" });

    if (!Array.isArray(rows) || rows.length === 0) {
      if (trigger === "MANUAL") {
        await prisma.sheetSyncLog
          .create({ data: { trigger, rowsIn: 0, imported: 0, skipped: 0, errors: null } })
          .catch(() => {});
        return res.json({ success: true, imported: 0, skipped: 0, message: "Manual sync logged (no rows)" });
      }
      return res.status(400).json({ success: false, error: "rows array is required" });
    }

    let imported = 0, skipped = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const {
          diNo, company, customerName, orderType = "DOMESTIC",
          orderDate, etd, priority = "MODERATE",
          customerProductName, inhouseProductName, inhouseProductCode,
          activeSpecs, activeIngredient, carrier, sectionName,
          totalQty, totalUom = "KG", unitQty, unitUom, unitPackType,
          packingType, totalCS, labelType, mrp, salesStaff, remarks,
        } = row;

        if (!diNo || !company || !customerName || !etd || !customerProductName || !inhouseProductName || !totalQty) {
          errors.push({ row: diNo || "?", error: "Missing required fields" });
          skipped++;
          continue;
        }

        let order = await prisma.salesOrder.findFirst({ where: { diNo: diNo.trim() } });
        if (!order) {
          const soId = await nextSoId();
          order = await prisma.salesOrder.create({
            data: {
              soId, company: company.trim(), diNo: diNo.trim(),
              customerName: customerName.trim(),
              orderType: orderType.trim().toUpperCase(),
              orderReceivedDate: orderDate ? new Date(orderDate) : new Date(),
              priority: priority.trim().toUpperCase(),
              estimatedDispatchDate: new Date(etd),
              salesStaff: salesStaff || null,
              remarks: remarks || null,
            },
          });
        }

        const existing = await prisma.salesOrderItem.findFirst({
          where: {
            salesOrderId: order.id,
            customerProductName: customerProductName.trim(),
            inhouseProductName: inhouseProductName.trim(),
          },
        });
        if (existing) { skipped++; continue; }

        const lineCount = await prisma.salesOrderItem.count({ where: { salesOrderId: order.id } });
        await prisma.salesOrderItem.create({
          data: {
            salesOrderId: order.id,
            lineNo: lineCount + 1,
            customerProductName: customerProductName.trim(),
            inhouseProductName: inhouseProductName.trim(),
            inhouseProductCode: inhouseProductCode || null,
            activeSpecs: activeSpecs || null,
            activeIngredient: activeIngredient || null,
            carrier: carrier || null,
            sectionName: sectionName || null,
            totalQty: parseFloat(totalQty),
            totalUom: totalUom.trim(),
            unitQty: unitQty ? parseFloat(unitQty) : null,
            unitUom: unitUom || null,
            unitPackType: unitPackType || null,
            packingType: packingType || null,
            totalCS: totalCS ? parseInt(totalCS) : null,
            labelType: labelType || null,
            mrp: mrp ? parseFloat(mrp) : null,
            status: "PENDING",
          },
        });
        imported++;
      } catch (ex) {
        errors.push({ row: row.diNo || "?", error: ex.message });
        skipped++;
      }
    }

    await prisma.sheetSyncLog
      .create({
        data: {
          trigger, rowsIn: rows.length, imported, skipped,
          errors: errors.length ? JSON.stringify(errors) : null,
        },
      })
      .catch(() => {});

    return res.json({ success: true, imported, skipped, errors: errors.length ? errors : undefined });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PUT /api/erp/sales-orders/:id
export async function updateSalesOrder(req, res) {
  try {
    const {
      company, diNo, customerName, orderType, orderReceivedDate,
      priority, estimatedDispatchDate, invoiceNo, invoiceDate,
      transportName, salesStaff, dispatchedBy, remarks,
    } = req.body;

    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        ...(company !== undefined && { company }),
        ...(diNo !== undefined && { diNo }),
        ...(customerName !== undefined && { customerName }),
        ...(orderType !== undefined && { orderType }),
        ...(priority !== undefined && { priority }),
        ...(orderReceivedDate !== undefined && { orderReceivedDate: new Date(orderReceivedDate) }),
        ...(estimatedDispatchDate !== undefined && { estimatedDispatchDate: new Date(estimatedDispatchDate) }),
        ...(invoiceNo !== undefined && { invoiceNo: invoiceNo || null }),
        ...(invoiceDate !== undefined && { invoiceDate: invoiceDate ? new Date(invoiceDate) : null }),
        ...(transportName !== undefined && { transportName: transportName || null }),
        ...(salesStaff !== undefined && { salesStaff: salesStaff || null }),
        ...(dispatchedBy !== undefined && { dispatchedBy: dispatchedBy || null }),
        ...(remarks !== undefined && { remarks: remarks || null }),
      },
      include: { items: { orderBy: { lineNo: "asc" } } },
    });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PATCH /api/erp/sales-orders/dispatch/:id
export async function patchDispatch(req, res) {
  try {
    const { invoiceNo, invoiceDate, transportName, salesStaff, dispatchedBy, dispatchRemarks } = req.body;
    const order = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: {
        ...(invoiceNo !== undefined && { invoiceNo: invoiceNo || null }),
        ...(invoiceDate !== undefined && { invoiceDate: invoiceDate ? new Date(invoiceDate) : null }),
        ...(transportName !== undefined && { transportName: transportName || null }),
        ...(salesStaff !== undefined && { salesStaff: salesStaff || null }),
        ...(dispatchedBy !== undefined && { dispatchedBy: dispatchedBy || null }),
        ...(dispatchRemarks !== undefined && { remarks: dispatchRemarks || null }),
      },
      include: { items: { orderBy: { lineNo: "asc" } } },
    });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PATCH /api/erp/sales-orders/item/:itemId
export async function updateSalesOrderItem(req, res) {
  try {
    const allowed = [
      "customerProductName", "inhouseProductName", "inhouseProductCode",
      "activeSpecs", "activeIngredient", "carrier", "batchNo", "sectionName",
      "totalQty", "totalUom", "unitQty", "unitUom", "unitPackType", "packingType",
      "totalCS", "labelType", "mrp", "mfgDate", "expDate", "status",
    ];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (["totalQty", "unitQty", "mrp"].includes(key) && req.body[key] !== null)
          data[key] = parseFloat(req.body[key]);
        else if (key === "totalCS" && req.body[key] !== null)
          data[key] = parseInt(req.body[key]);
        else if (["mfgDate", "expDate"].includes(key))
          data[key] = req.body[key] ? new Date(req.body[key]) : null;
        else data[key] = req.body[key] || null;
      }
    }
    const item = await prisma.salesOrderItem.update({ where: { id: req.params.itemId }, data });
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/erp/sales-orders/:id
export async function deleteSalesOrder(req, res) {
  try {
    await prisma.salesOrder.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/erp/sales-orders/item/:itemId
export async function deleteSalesOrderItem(req, res) {
  try {
    await prisma.salesOrderItem.delete({ where: { id: req.params.itemId } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
