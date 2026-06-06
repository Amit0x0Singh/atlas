// ── POST /api/erp/sales-orders  ──────────────────────────────────────────
//  post("/")
const createSalesOrder = async (req, reply) => {
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
    items,
  } = req.body;

  if (!company || !diNo || !customerName || !orderType)
    return reply.status(400).send({
      success: false,
      error: "company, diNo, customerName, orderType are required",
    });

  if (!items || !Array.isArray(items) || items.length === 0)
    return reply
      .status(400)
      .send({ success: false, error: "At least one order item is required" });

  const soId = await nextSoId();

  const order = await prisma.salesOrder.create({
    data: {
      soId,
      company,
      diNo,
      customerName,
      orderType,
      orderReceivedDate: orderReceivedDate
        ? new Date(orderReceivedDate)
        : new Date(),
      priority: priority || "MODERATE",
      estimatedDispatchDate: estimatedDispatchDate
        ? new Date(estimatedDispatchDate)
        : orderReceivedDate
          ? new Date(orderReceivedDate)
          : new Date(),
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
};
