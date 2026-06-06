//  fastify.post('/sync', { preHandler: plannerOrAbove }, async (req, reply) => {
const syncFromExcelHandler = async (req, reply) => {
  try {
    const result = await syncFromExcel();
    return { success: true, ...result };
  } catch (e) {
    return reply.status(500).send({ success: false, error: e.message });
  }
};

// ─── MS365 Excel Sync ──────────────────────────────────────────────────────
async function syncFromExcel() {
  const MS365_ENABLED = process.env.MS365_ENABLED === "true";
  if (!MS365_ENABLED)
    return {
      message: "MS365 sync disabled. Set MS365_ENABLED=true to enable.",
      synced: 0,
    };

  const tenantId = process.env.MS365_TENANT_ID;
  const clientId = process.env.MS365_CLIENT_ID;
  const clientSecret = process.env.MS365_CLIENT_SECRET;
  const fileId = process.env.MS365_FILE_ID;
  const sheetName = process.env.MS365_SHEET_NAME || "Sales_Orders";

  // Get OAuth token
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    },
  );
  const { access_token } = await tokenRes.json();

  // Read worksheet
  const sheetRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets/${sheetName}/usedRange`,
    { headers: { Authorization: `Bearer ${access_token}` } },
  );
  const sheetData = await sheetRes.json();
  const rows = sheetData.values || [];
  if (rows.length < 2) return { synced: 0, message: "No data rows found" };

  const headers = rows[0].map((h) =>
    h?.toString().trim().toLowerCase().replace(/\s+/g, "_"),
  );
  const col = (name) => headers.indexOf(name);
  let synced = 0,
    created = 0,
    updated = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const di_number = row[col("di_number")]?.toString().trim();
    if (!di_number) continue;

    const rowData = {
      di_number,
      company: row[col("company")] || null,
      order_type: row[col("order_type")] || "Domestic",
      customer_name: row[col("customer_name")] || null,
      order_date: row[col("order_date")] || null,
      etd: row[col("etd")] || null,
      product_code: row[col("product_code")] || null,
      order_qty: parseFloat(row[col("order_qty")]) || null,
      qty_unit: row[col("qty_unit")] || "kg",
      active_ingredient: row[col("active_ingredient")] || null,
      specifications: row[col("specifications")] || null,
      carrier: row[col("carrier")] || null,
      per_unit_qty_pp: parseFloat(row[col("per_unit_qty_pp")]) || null,
      primary_pack_type: row[col("primary_pack_type")] || null,
      secondary_pack_type: row[col("secondary_pack_type")] || null,
      label_type: row[col("label_type")] || null,
      priority: row[col("priority")] || "Normal",
      sales_staff: row[col("sales_staff")] || null,
      notes: row[col("notes")] || null,
    };

    const existing =
      await prisma.$queryRaw`SELECT di_number, etd, order_qty, status FROM sales_orders WHERE di_number = ${di_number}`;

    if (!existing[0]) {
      // New order — insert
      const prod =
        await prisma.$queryRaw`SELECT product_name FROM erp_products WHERE product_code = ${rowData.product_code}`;
      if (!prod[0]) continue; // Skip if product not in master
      await prisma.$executeRaw`
        INSERT INTO sales_orders (di_number, company, order_type, status, customer_name, order_date, etd,
          product_code, product_name, order_qty, qty_unit, active_ingredient, specifications, carrier,
          per_unit_qty_pp, primary_pack_type, secondary_pack_type, label_type, priority, sales_staff, notes,
          excel_synced_at)
        VALUES (${rowData.di_number}, ${rowData.company}, ${rowData.order_type}, 'new',
          ${rowData.customer_name}, ${rowData.order_date}::date, ${rowData.etd}::date,
          ${rowData.product_code}, ${prod[0].product_name}, ${rowData.order_qty}, ${rowData.qty_unit},
          ${rowData.active_ingredient}, ${rowData.specifications}, ${rowData.carrier},
          ${rowData.per_unit_qty_pp}, ${rowData.primary_pack_type}, ${rowData.secondary_pack_type},
          ${rowData.label_type}, ${rowData.priority}, ${rowData.sales_staff}, ${rowData.notes}, NOW())
        ON CONFLICT (di_number) DO NOTHING
      `;
      created++;
    } else if (existing[0].status !== "cancelled") {
      // Check for changes to ETD or qty
      const etdChanged =
        rowData.etd &&
        existing[0].etd?.toISOString().slice(0, 10) !==
          new Date(rowData.etd).toISOString().slice(0, 10);
      const qtyChanged =
        rowData.order_qty &&
        Math.abs(Number(existing[0].order_qty) - rowData.order_qty) > 0.001;

      if (etdChanged || qtyChanged) {
        await prisma.$executeRaw`
          UPDATE sales_orders SET
            etd = ${rowData.etd}::date,
            order_qty = ${rowData.order_qty},
            status = CASE WHEN status IN ('confirmed','planned') THEN 'at_risk' ELSE status END,
            excel_synced_at = NOW(), updated_at = NOW()
          WHERE di_number = ${di_number}
        `;
        updated++;
      }
    }
    synced++;
  }

  return {
    synced,
    created,
    updated,
    message: `Sync complete: ${created} created, ${updated} updated`,
  };
}
