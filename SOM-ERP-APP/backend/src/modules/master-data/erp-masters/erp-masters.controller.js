/**
 * ERP Masters — /api/erp/masters/*
 * Items, Suppliers, Plants, Equipment, Products, BOM, Microbial Strains, Customers
 */
import prisma from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { writeAudit, auditUser } from '../middleware/audit.js'
import { createNotification } from '../services/notification-service.js'

const adminOrStore = authorize(['admin', 'store_manager', 'store_person'])
const adminOnly    = authorize(['admin'])
const plannerPlus  = authorize(['admin', 'planner', 'planning_manager'])

export default async function erpMastersRoutes(fastify) {

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/items', { preHandler: authenticate }, async (req) => {
    const { category, search, active } = req.query
    let where = 'WHERE 1=1'
    const params = []
    if (category) { params.push(category); where += ` AND item_category = $${params.length}` }
    if (search)   { params.push(`%${search}%`); where += ` AND (item_name ILIKE $${params.length} OR item_code ILIKE $${params.length})` }
    if (active !== undefined) { params.push(active === 'true'); where += ` AND is_active = $${params.length}` }

    const items = await prisma.$queryRawUnsafe(
      `SELECT i.*, s.supplier_name AS default_supplier_name
       FROM erp_items i
       LEFT JOIN erp_suppliers s ON s.supplier_id = i.supplier_default
       ${where} ORDER BY item_name ASC`,
      ...params
    )
    return { success: true, data: items }
  })

  fastify.get('/items/:code', { preHandler: authenticate }, async (req, reply) => {
    const rows = await prisma.$queryRaw`
      SELECT i.*, s.supplier_name AS default_supplier_name
      FROM erp_items i
      LEFT JOIN erp_suppliers s ON s.supplier_id = i.supplier_default
      WHERE i.item_code = ${req.params.code}
    `
    if (!rows[0]) return reply.status(404).send({ success: false, error: 'Item not found' })
    return { success: true, data: rows[0] }
  })

  fastify.post('/items', { preHandler: authorize(['admin', 'store_manager']) }, async (req, reply) => {
    const { item_code, item_name, item_category, uom, warehouse_zone,
            reorder_level, decanting_tolerance_pct, is_microbial, supplier_default } = req.body || {}
    if (!item_code || !item_name || !item_category || !uom)
      return reply.status(400).send({ success: false, error: 'item_code, item_name, item_category, uom required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO erp_items (item_code, item_name, item_category, uom, warehouse_zone,
        reorder_level, decanting_tolerance_pct, is_microbial, supplier_default)
      VALUES (${item_code}, ${item_name}, ${item_category}, ${uom},
        ${warehouse_zone || null}, ${reorder_level || 0}, ${decanting_tolerance_pct || 0.5},
        ${is_microbial || false}, ${supplier_default || null}::uuid)
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_items', recordId: item_code, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  fastify.put('/items/:code', { preHandler: authorize(['admin', 'store_manager']) }, async (req, reply) => {
    const { item_name, item_category, uom, warehouse_zone, reorder_level,
            decanting_tolerance_pct, is_microbial, supplier_default, is_active } = req.body || {}
    await prisma.$executeRaw`
      UPDATE erp_items SET
        item_name = COALESCE(${item_name}, item_name),
        item_category = COALESCE(${item_category}, item_category),
        uom = COALESCE(${uom}, uom),
        warehouse_zone = COALESCE(${warehouse_zone}, warehouse_zone),
        reorder_level = COALESCE(${reorder_level}, reorder_level),
        decanting_tolerance_pct = COALESCE(${decanting_tolerance_pct}, decanting_tolerance_pct),
        is_microbial = COALESCE(${is_microbial}, is_microbial),
        supplier_default = COALESCE(${supplier_default || null}::uuid, supplier_default),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = NOW()
      WHERE item_code = ${req.params.code}
    `
    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'erp_items', recordId: req.params.code, newValue: req.body })
    return { success: true, message: 'Item updated' }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/suppliers', { preHandler: authenticate }, async () => {
    const data = await prisma.$queryRaw`SELECT * FROM erp_suppliers WHERE is_active = true ORDER BY supplier_name`
    return { success: true, data }
  })

  fastify.post('/suppliers', { preHandler: authorize(['admin', 'store_manager']) }, async (req, reply) => {
    const { supplier_name, gstin, phone, email, address } = req.body || {}
    if (!supplier_name) return reply.status(400).send({ success: false, error: 'supplier_name required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO erp_suppliers (supplier_name, gstin, phone, email, address)
      VALUES (${supplier_name}, ${gstin || null}, ${phone || null}, ${email || null}, ${address || null})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_suppliers', recordId: rows[0].supplier_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  fastify.put('/suppliers/:id', { preHandler: authorize(['admin', 'store_manager']) }, async (req, reply) => {
    const { supplier_name, gstin, phone, email, address, is_active } = req.body || {}
    await prisma.$executeRaw`
      UPDATE erp_suppliers SET
        supplier_name = COALESCE(${supplier_name}, supplier_name),
        gstin = COALESCE(${gstin}, gstin),
        phone = COALESCE(${phone}, phone),
        email = COALESCE(${email}, email),
        address = COALESCE(${address}, address),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = NOW()
      WHERE supplier_id = ${req.params.id}::uuid
    `
    return { success: true, message: 'Supplier updated' }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANTS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/plants', { preHandler: authenticate }, async () => {
    const data = await prisma.$queryRaw`SELECT * FROM erp_plants WHERE is_active = true ORDER BY plant_name`
    return { success: true, data }
  })

  fastify.post('/plants', { preHandler: adminOnly }, async (req, reply) => {
    const { plant_name, plant_code, location, plant_type } = req.body || {}
    if (!plant_name || !plant_code || !plant_type)
      return reply.status(400).send({ success: false, error: 'plant_name, plant_code, plant_type required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO erp_plants (plant_name, plant_code, location, plant_type)
      VALUES (${plant_name}, ${plant_code}, ${location || null}, ${plant_type})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_plants', recordId: rows[0].plant_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // EQUIPMENT
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/equipment', { preHandler: authenticate }, async (req) => {
    const { plant_id } = req.query
    if (plant_id) {
      const data = await prisma.$queryRaw`
        SELECT e.*, p.plant_name FROM erp_equipment e
        JOIN erp_plants p ON p.plant_id = e.plant_id
        WHERE e.plant_id = ${plant_id}::uuid ORDER BY e.equipment_name
      `
      return { success: true, data }
    }
    const data = await prisma.$queryRaw`
      SELECT e.*, p.plant_name FROM erp_equipment e
      LEFT JOIN erp_plants p ON p.plant_id = e.plant_id
      ORDER BY e.equipment_name
    `
    return { success: true, data }
  })

  fastify.post('/equipment', { preHandler: adminOnly }, async (req, reply) => {
    const { plant_id, equipment_name, equipment_code, equipment_type,
            working_volume, working_volume_unit, cleaning_time_hrs, requires_sterilisation } = req.body || {}
    if (!equipment_name || !equipment_code || !equipment_type)
      return reply.status(400).send({ success: false, error: 'equipment_name, equipment_code, equipment_type required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO erp_equipment (plant_id, equipment_name, equipment_code, equipment_type,
        working_volume, working_volume_unit, cleaning_time_hrs, requires_sterilisation)
      VALUES (${plant_id || null}::uuid, ${equipment_name}, ${equipment_code}, ${equipment_type},
        ${working_volume || null}, ${working_volume_unit || 'KG'},
        ${cleaning_time_hrs || 0}, ${requires_sterilisation || false})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_equipment', recordId: rows[0].equipment_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  fastify.patch('/equipment/:id', { preHandler: adminOnly }, async (req, reply) => {
    const { status, equipment_name, working_volume, cleaning_time_hrs } = req.body || {}
    await prisma.$executeRaw`
      UPDATE erp_equipment SET
        status = COALESCE(${status}, status),
        equipment_name = COALESCE(${equipment_name}, equipment_name),
        working_volume = COALESCE(${working_volume}, working_volume),
        cleaning_time_hrs = COALESCE(${cleaning_time_hrs}, cleaning_time_hrs),
        updated_at = NOW()
      WHERE equipment_id = ${req.params.id}::uuid
    `
    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'erp_equipment', recordId: req.params.id, newValue: req.body })
    return { success: true, message: 'Equipment updated' }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTS (ERP extended)
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/erp-products', { preHandler: authenticate }, async (req) => {
    const { status } = req.query
    const data = await prisma.$queryRaw`
      SELECT p.*, pl.plant_name, ms.strain_name
      FROM erp_products p
      LEFT JOIN erp_plants pl ON pl.plant_id = p.plant_id
      LEFT JOIN microbial_strains ms ON ms.strain_id = p.microbial_strain_id
      WHERE (${status || null}::text IS NULL OR p.status = ${status || null})
      ORDER BY p.product_name
    `
    return { success: true, data }
  })

  fastify.post('/erp-products', { preHandler: adminOnly }, async (req, reply) => {
    const { product_code, product_name, product_category, plant_id, alternate_plant_id,
            alt_plant_requires_approval, formulation_type, shelf_life_days,
            consolidation_window_days, is_microbial, microbial_strain_id } = req.body || {}
    if (!product_code || !product_name)
      return reply.status(400).send({ success: false, error: 'product_code and product_name required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO erp_products (product_code, product_name, product_category, plant_id, alternate_plant_id,
        alt_plant_requires_approval, formulation_type, shelf_life_days, consolidation_window_days,
        is_microbial, microbial_strain_id)
      VALUES (${product_code}, ${product_name}, ${product_category || null},
        ${plant_id || null}::uuid, ${alternate_plant_id || null}::uuid,
        ${alt_plant_requires_approval || false}, ${formulation_type || null},
        ${shelf_life_days || null}, ${consolidation_window_days || 3},
        ${is_microbial || false}, ${microbial_strain_id || null}::uuid)
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_products', recordId: product_code, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // BOM HEADERS + LINES
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/bom', { preHandler: plannerPlus }, async (req) => {
    const { product_code, status } = req.query
    const data = await prisma.$queryRaw`
      SELECT b.*, u.full_name AS approved_by_name
      FROM bom_headers b
      LEFT JOIN users u ON u.user_id = b.approved_by
      WHERE (${product_code || null}::text IS NULL OR b.product_code = ${product_code || null})
        AND (${status || null}::text IS NULL OR b.status = ${status || null})
      ORDER BY b.product_code, b.effective_date DESC
    `
    return { success: true, data }
  })

  fastify.get('/bom/:id', { preHandler: authenticate }, async (req, reply) => {
    const bom = await prisma.$queryRaw`SELECT * FROM bom_headers WHERE bom_id = ${req.params.id}::uuid`
    if (!bom[0]) return reply.status(404).send({ success: false, error: 'BOM not found' })
    const formulation = await prisma.$queryRaw`
      SELECT f.*, i.item_name FROM bom_lines_formulation f
      JOIN erp_items i ON i.item_code = f.item_code
      WHERE f.bom_id = ${req.params.id}::uuid ORDER BY f.seq_no
    `
    const packing = await prisma.$queryRaw`
      SELECT p.*, i.item_name FROM bom_lines_packing p
      JOIN erp_items i ON i.item_code = p.item_code
      WHERE p.bom_id = ${req.params.id}::uuid ORDER BY p.seq_no
    `
    return { success: true, data: { ...bom[0], formulation_lines: formulation, packing_lines: packing } }
  })

  fastify.post('/bom', { preHandler: authorize(['admin', 'planning_manager']) }, async (req, reply) => {
    const { product_code, bom_version, effective_date, yield_pct, notes,
            formulation_lines = [], packing_lines = [] } = req.body || {}
    if (!product_code || !bom_version || !effective_date)
      return reply.status(400).send({ success: false, error: 'product_code, bom_version, effective_date required' })

    // Mark previous active version inactive
    await prisma.$executeRaw`
      UPDATE bom_headers SET status = 'inactive' WHERE product_code = ${product_code} AND status = 'active'
    `
    const bom = await prisma.$queryRaw`
      INSERT INTO bom_headers (product_code, bom_version, effective_date, approved_by, yield_pct, notes)
      VALUES (${product_code}, ${bom_version}, ${effective_date}, ${req.user?.user_id || null}::uuid,
              ${yield_pct || 98}, ${notes || null})
      RETURNING *
    `
    const bom_id = bom[0].bom_id

    // Insert formulation lines
    for (let i = 0; i < formulation_lines.length; i++) {
      const { item_code, qty_per_unit, unit, is_critical } = formulation_lines[i]
      await prisma.$executeRaw`
        INSERT INTO bom_lines_formulation (bom_id, item_code, qty_per_unit, unit, is_critical, seq_no)
        VALUES (${bom_id}::uuid, ${item_code}, ${qty_per_unit}, ${unit}, ${is_critical || false}, ${i + 1})
      `
    }
    // Insert packing lines
    for (let i = 0; i < packing_lines.length; i++) {
      const { item_code, qty_per_unit, unit } = packing_lines[i]
      await prisma.$executeRaw`
        INSERT INTO bom_lines_packing (bom_id, item_code, qty_per_unit, unit, seq_no)
        VALUES (${bom_id}::uuid, ${item_code}, ${qty_per_unit}, ${unit}, ${i + 1})
      `
    }

    // Notify planning team of BOM change
    await createNotification({
      type: 'bom_version_changed',
      title: `BOM Updated: ${product_code} → ${bom_version}`,
      message: `BOM for Product ${product_code} updated to ${bom_version}. All pending plans using previous version require review.`,
      targetRole: 'planner',
      refType: 'bom_header',
      refId: bom_id,
    })

    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'bom_headers', recordId: bom_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: bom[0] })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // MICROBIAL STRAINS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/strains', { preHandler: authenticate }, async () => {
    const data = await prisma.$queryRaw`SELECT * FROM microbial_strains WHERE is_active = true ORDER BY strain_name`
    return { success: true, data }
  })

  fastify.post('/strains', { preHandler: adminOnly }, async (req, reply) => {
    const { strain_name, decay_k, optimal_temp_c, min_viable_cfu_per_ml, notes } = req.body || {}
    if (!strain_name || decay_k === undefined)
      return reply.status(400).send({ success: false, error: 'strain_name and decay_k required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO microbial_strains (strain_name, decay_k, optimal_temp_c, min_viable_cfu_per_ml, notes)
      VALUES (${strain_name}, ${decay_k}, ${optimal_temp_c || null}, ${min_viable_cfu_per_ml || null}, ${notes || null})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'microbial_strains', recordId: rows[0].strain_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/customers', { preHandler: authenticate }, async () => {
    const data = await prisma.$queryRaw`SELECT * FROM customers WHERE is_active = true ORDER BY customer_name`
    return { success: true, data }
  })

  fastify.post('/customers', { preHandler: authorize(['admin', 'sales_team', 'store_manager']) }, async (req, reply) => {
    const { customer_name, customer_code, gstin, address, state, phone, email } = req.body || {}
    if (!customer_name) return reply.status(400).send({ success: false, error: 'customer_name required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO customers (customer_name, customer_code, gstin, address, state, phone, email)
      VALUES (${customer_name}, ${customer_code || null}, ${gstin || null},
              ${address || null}, ${state || null}, ${phone || null}, ${email || null})
      RETURNING *
    `
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // REASON CODES
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/reason-codes', { preHandler: authenticate }, async (req) => {
    const { category } = req.query
    const data = category
      ? await prisma.$queryRaw`SELECT * FROM reason_codes WHERE category = ${category} AND is_active = true ORDER BY label`
      : await prisma.$queryRaw`SELECT * FROM reason_codes WHERE is_active = true ORDER BY category, label`
    return { success: true, data }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTAINERS (for decanting) — list + create
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.get('/containers', { preHandler: authenticate }, async (req) => {
    const { item_code } = req.query
    const data = item_code
      ? await prisma.$queryRaw`
          SELECT c.*, i.item_name FROM erp_containers c
          JOIN erp_items i ON i.item_code = c.item_code
          WHERE c.item_code = ${item_code} AND c.is_active = true ORDER BY c.container_id`
      : await prisma.$queryRaw`
          SELECT c.*, i.item_name FROM erp_containers c
          JOIN erp_items i ON i.item_code = c.item_code
          WHERE c.is_active = true ORDER BY c.container_id`
    return { success: true, data }
  })

  fastify.post('/containers', { preHandler: authorize(['admin', 'store_manager']) }, async (req, reply) => {
    const { container_id, container_qr, item_code, location, max_capacity,
            uom, low_stock_threshold } = req.body || {}
    if (!container_id || !item_code || !max_capacity)
      return reply.status(400).send({ success: false, error: 'container_id, item_code, max_capacity required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO erp_containers (container_id, container_qr, item_code, location, max_capacity, uom, low_stock_threshold)
      VALUES (${container_id}, ${container_qr || container_id}, ${item_code},
              ${location || null}, ${max_capacity}, ${uom || null}, ${low_stock_threshold || 0})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'erp_containers', recordId: container_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })
}
