import prisma from '../../../../db.js'

async function ensureTables() {
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS microbe_master (microbe_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, microbe_name TEXT NOT NULL, microbe_code TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS microbial_sfg_container_seq (microbe_code TEXT NOT NULL, type_code TEXT NOT NULL, seq INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (microbe_code, type_code))`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS microbial_sfg_container (container_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, container_code TEXT UNIQUE NOT NULL, microbe_id TEXT REFERENCES microbe_master(microbe_id), microbe_code TEXT NOT NULL, microbe_name TEXT NOT NULL, microbe_type TEXT NOT NULL, type_code TEXT NOT NULL, seq_no INTEGER NOT NULL DEFAULT 1, location TEXT, capacity_kg DOUBLE PRECISION, current_qty_kg DOUBLE PRECISION NOT NULL DEFAULT 0, fill_status TEXT NOT NULL DEFAULT 'EMPTY', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS microbial_sfg_inward (inward_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, container_id TEXT REFERENCES microbial_sfg_container(container_id), container_code TEXT NOT NULL, microbe_id TEXT REFERENCES microbe_master(microbe_id), microbe_code TEXT NOT NULL, microbe_name TEXT NOT NULL, microbe_type TEXT NOT NULL, inhouse_cfu_per_g DOUBLE PRECISION NOT NULL, biomass_batch_code TEXT NOT NULL, date_of_harvest DATE NOT NULL, total_qty_kg DOUBLE PRECISION NOT NULL, remaining_qty_kg DOUBLE PRECISION NOT NULL, location TEXT, moisture DOUBLE PRECISION, shelf_life_days INTEGER, fill_status TEXT NOT NULL DEFAULT 'PARTIAL', status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS microbial_sfg_allocation (allocation_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, plan_id TEXT NOT NULL, inward_id TEXT REFERENCES microbial_sfg_inward(inward_id), container_code TEXT NOT NULL, microbe_code TEXT NOT NULL, microbe_name TEXT NOT NULL, microbe_type TEXT NOT NULL, allocated_qty_kg DOUBLE PRECISION NOT NULL, multiplication_factor DOUBLE PRECISION NOT NULL DEFAULT 1, required_cfu_per_g DOUBLE PRECISION, inhouse_cfu_per_g DOUBLE PRECISION, order_qty_kg DOUBLE PRECISION, status TEXT NOT NULL DEFAULT 'RESERVED', notified_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
    await prisma.$executeRawUnsafe(`ALTER TABLE recipe_db ADD COLUMN IF NOT EXISTS is_microbe BOOLEAN NOT NULL DEFAULT false`)
    await prisma.$executeRawUnsafe(`ALTER TABLE recipe_db ADD COLUMN IF NOT EXISTS microbe_code TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE recipe_db ADD COLUMN IF NOT EXISTS required_cfu DOUBLE PRECISION`)
    console.log('[microbial-sfg] Tables ensured OK')
  } catch (e) {
    console.error('[microbial-sfg] Table setup warning:', e.message)
  }
}

ensureTables().catch(err => console.error('[microbial-sfg-init]', err.message))

export async function migrateTables(req, res) {
  try {
    await ensureTables()
    return res.json({ success: true, message: 'Microbial SFG tables ensured' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listMicrobes(req, res) {
  try {
    const rows = await prisma.$queryRaw`SELECT * FROM microbe_master ORDER BY microbe_name ASC`
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getMicrobe(req, res) {
  try {
    const rows = await prisma.$queryRaw`SELECT * FROM microbe_master WHERE microbe_id = ${req.params.id}`
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Microbe not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createMicrobe(req, res) {
  try {
    const { microbe_name, microbe_code } = req.body || {}
    if (!microbe_name || !microbe_code)
      return res.status(400).json({ success: false, error: 'microbe_name and microbe_code are required' })
    const upper = microbe_code.trim().toUpperCase()
    const rows = await prisma.$queryRaw`
      INSERT INTO microbe_master (microbe_name, microbe_code) VALUES (${microbe_name.trim()}, ${upper}) RETURNING *
    `
    return res.status(201).json({ success: true, data: rows[0] })
  } catch (e) {
    if (e.message?.includes('unique') || e.message?.includes('duplicate'))
      return res.status(409).json({ success: false, error: `Microbe code already exists` })
    return res.status(500).json({ success: false, error: e.message })
  }
}

export async function updateMicrobe(req, res) {
  try {
    const { microbe_name, microbe_code } = req.body || {}
    const rows = await prisma.$queryRaw`
      UPDATE microbe_master
      SET microbe_name = COALESCE(${microbe_name || null}, microbe_name),
          microbe_code = COALESCE(${microbe_code ? microbe_code.toUpperCase() : null}, microbe_code),
          updated_at   = NOW()
      WHERE microbe_id = ${req.params.id}
      RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Microbe not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function deleteMicrobe(req, res) {
  try {
    await prisma.$executeRaw`DELETE FROM microbe_master WHERE microbe_id = ${req.params.id}`
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function importMicrobes(req, res) {
  try {
    const { rows } = req.body || {}
    if (!Array.isArray(rows) || !rows.length)
      return res.status(400).json({ success: false, error: 'rows array required' })
    let imported = 0, skipped = 0
    const errors = []
    for (const r of rows) {
      const keys = Object.keys(r)
      const nameKey = keys.find(k => /microbe.?name|^name$/i.test(k))
      const codeKey = keys.find(k => /microbe.?code|^code$/i.test(k))
      const name = (r.microbe_name || r['Microbe Name'] || r['MICROBE NAME'] || (nameKey ? r[nameKey] : '') || '').toString().trim()
      const code = (r.microbe_code || r['Microbe Code'] || r['MICROBE CODE'] || (codeKey ? r[codeKey] : '') || '').toString().trim().toUpperCase()
      if (!name || !code) { skipped++; errors.push({ row: JSON.stringify(r).slice(0, 80), error: 'Could not find Microbe Name or Microbe Code columns' }); continue }
      try {
        await prisma.$executeRaw`
          INSERT INTO microbe_master (microbe_name, microbe_code) VALUES (${name}, ${code})
          ON CONFLICT (microbe_code) DO UPDATE SET microbe_name = EXCLUDED.microbe_name, updated_at = NOW()
        `
        imported++
      } catch (e) {
        errors.push({ row: code, error: e.message })
        skipped++
      }
    }
    return res.json({ success: true, imported, skipped, errors })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
