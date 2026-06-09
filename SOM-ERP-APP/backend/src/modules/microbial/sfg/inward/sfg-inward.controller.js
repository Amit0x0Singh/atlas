import prisma from '../../../../db.js'

function excelDateToIso(val) {
  if (val === null || val === undefined || val === '') return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  const num = Number(val)
  if (!isNaN(num) && Number.isInteger(num) && num > 1000) {
    const ms = (num - 25569) * 86400 * 1000
    const d = new Date(ms)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
  const s = String(val).trim()
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return s
}

async function getNextContainerSeq(microbe_code, type_code) {
  await prisma.$executeRaw`
    INSERT INTO microbial_sfg_container_seq (microbe_code, type_code, seq)
    VALUES (${microbe_code}, ${type_code}, 1)
    ON CONFLICT (microbe_code, type_code) DO UPDATE SET seq = microbial_sfg_container_seq.seq + 1
  `
  const row = await prisma.$queryRaw`SELECT seq FROM microbial_sfg_container_seq WHERE microbe_code = ${microbe_code} AND type_code = ${type_code}`
  return row[0]?.seq || 1
}

function buildContainerCode(microbe_code, type_code, seq) {
  return `${microbe_code}-${type_code}-${String(seq).padStart(3, '0')}`
}

export async function listSfgContainers(req, res) {
  try {
    const { microbe_code, type_code, fill_status } = req.query
    const rows = await prisma.$queryRaw`
      SELECT c.*, (SELECT COUNT(*) FROM microbial_sfg_inward i WHERE i.container_id = c.container_id AND i.status = 'ACTIVE') AS batch_count
      FROM microbial_sfg_container c
      WHERE (${microbe_code || null}::text IS NULL OR c.microbe_code = ${microbe_code || null})
        AND (${type_code    || null}::text IS NULL OR c.type_code    = ${type_code    || null})
        AND (${fill_status  || null}::text IS NULL OR c.fill_status  = ${fill_status  || null})
      ORDER BY c.microbe_code, c.type_code, c.seq_no
    `
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listAvailableSfgContainers(req, res) {
  try {
    const { microbe_code, type_code } = req.query
    const rows = await prisma.$queryRaw`
      SELECT * FROM microbial_sfg_container
      WHERE microbe_code = ${microbe_code} AND type_code = ${type_code} AND fill_status IN ('PARTIAL','EMPTY')
      ORDER BY fill_status DESC, seq_no ASC
    `
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getNextContainerCode(req, res) {
  try {
    const { microbe_code, type_code } = req.query
    if (!microbe_code || !type_code) return res.status(400).json({ success: false, error: 'microbe_code and type_code required' })
    const rows = await prisma.$queryRaw`SELECT COALESCE(MAX(seq_no), 0) AS max_seq FROM microbial_sfg_container WHERE microbe_code = ${microbe_code} AND type_code = ${type_code}`
    const nextSeq = Number(rows[0]?.max_seq || 0) + 1
    return res.json({ success: true, data: { next_code: buildContainerCode(microbe_code, type_code, nextSeq), next_seq: nextSeq } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getSfgContainerBatches(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT * FROM microbial_sfg_inward WHERE container_id = ${req.params.id} ORDER BY date_of_harvest ASC, created_at ASC
    `
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listSfgInward(req, res) {
  try {
    const { microbe_code, microbe_type, status } = req.query
    const rows = await prisma.$queryRaw`
      SELECT i.*, c.location AS container_location, c.fill_status AS container_fill_status
      FROM microbial_sfg_inward i LEFT JOIN microbial_sfg_container c ON c.container_id = i.container_id
      WHERE (${microbe_code || null}::text IS NULL OR i.microbe_code = ${microbe_code || null})
        AND (${microbe_type || null}::text IS NULL OR i.microbe_type = ${microbe_type || null})
        AND (${status       || null}::text IS NULL OR i.status       = ${status       || null})
      ORDER BY i.date_of_harvest ASC, i.created_at ASC
    `
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getSfgInwardSummary(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT i.microbe_code, i.microbe_name, i.microbe_type,
             COUNT(*) FILTER (WHERE i.status = 'ACTIVE') AS active_batches,
             COALESCE(SUM(i.remaining_qty_kg) FILTER (WHERE i.status = 'ACTIVE'), 0) AS total_remaining_kg,
             COALESCE(AVG(i.inhouse_cfu_per_g) FILTER (WHERE i.status = 'ACTIVE'), 0) AS avg_cfu_per_g,
             MAX(i.date_of_harvest) AS latest_harvest
      FROM microbial_sfg_inward i
      GROUP BY i.microbe_code, i.microbe_name, i.microbe_type
      ORDER BY i.microbe_name, i.microbe_type
    `
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createSfgInward(req, res) {
  try {
    const { container_id, new_container_code, microbe_id, microbe_code, microbe_name, microbe_type, type_code,
            inhouse_cfu_per_g, biomass_batch_code, date_of_harvest, total_qty_kg, location, moisture, shelf_life_days, fill_status } = req.body || {}
    if (!microbe_code || !microbe_type || !inhouse_cfu_per_g || !biomass_batch_code || !date_of_harvest || !total_qty_kg)
      return res.status(400).json({ success: false, error: 'Required: microbe_code, microbe_type, inhouse_cfu_per_g, biomass_batch_code, date_of_harvest, total_qty_kg' })
    const tCode = (type_code || microbe_type).toUpperCase()
    let resolvedContainerId = container_id
    let resolvedContainerCode
    if (!resolvedContainerId) {
      const seq = await getNextContainerSeq(microbe_code, tCode)
      const code = new_container_code || buildContainerCode(microbe_code, tCode, seq)
      const rows = await prisma.$queryRaw`
        INSERT INTO microbial_sfg_container (container_code, microbe_id, microbe_code, microbe_name, microbe_type, type_code, seq_no, location, current_qty_kg, fill_status)
        VALUES (${code}, ${microbe_id || null}, ${microbe_code}, ${microbe_name || microbe_code}, ${microbe_type}, ${tCode}, ${seq}, ${location || null}, ${Number(total_qty_kg)}, ${fill_status || 'PARTIAL'})
        RETURNING *
      `
      resolvedContainerId = rows[0].container_id
      resolvedContainerCode = code
    } else {
      const cRows = await prisma.$queryRaw`SELECT container_code FROM microbial_sfg_container WHERE container_id = ${resolvedContainerId}`
      if (!cRows[0]) return res.status(404).json({ success: false, error: 'Container not found' })
      resolvedContainerCode = cRows[0].container_code
    }
    const inward = await prisma.$queryRaw`
      INSERT INTO microbial_sfg_inward (container_id, container_code, microbe_id, microbe_code, microbe_name, microbe_type, inhouse_cfu_per_g, biomass_batch_code, date_of_harvest, total_qty_kg, remaining_qty_kg, location, moisture, shelf_life_days, fill_status)
      VALUES (${resolvedContainerId}, ${resolvedContainerCode}, ${microbe_id || null}, ${microbe_code}, ${microbe_name || microbe_code}, ${microbe_type}, ${Number(inhouse_cfu_per_g)}, ${biomass_batch_code}, ${date_of_harvest}::date, ${Number(total_qty_kg)}, ${Number(total_qty_kg)}, ${location || null}, ${moisture != null ? Number(moisture) : null}, ${shelf_life_days != null ? Number(shelf_life_days) : null}, ${fill_status || 'PARTIAL'})
      RETURNING *
    `
    await prisma.$executeRaw`
      UPDATE microbial_sfg_container SET current_qty_kg = current_qty_kg + ${Number(total_qty_kg)}, fill_status = ${fill_status || 'PARTIAL'}, location = COALESCE(${location || null}, location), updated_at = NOW() WHERE container_id = ${resolvedContainerId}
    `
    return res.status(201).json({ success: true, data: inward[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function updateSfgInward(req, res) {
  try {
    const { remaining_qty_kg, fill_status, status, location, moisture, shelf_life_days } = req.body || {}
    const rows = await prisma.$queryRaw`
      UPDATE microbial_sfg_inward
      SET remaining_qty_kg = COALESCE(${remaining_qty_kg != null ? Number(remaining_qty_kg) : null}, remaining_qty_kg),
          fill_status      = COALESCE(${fill_status || null}, fill_status),
          status           = COALESCE(${status || null}, status),
          location         = COALESCE(${location || null}, location),
          moisture         = COALESCE(${moisture != null ? Number(moisture) : null}, moisture),
          shelf_life_days  = COALESCE(${shelf_life_days != null ? Number(shelf_life_days) : null}, shelf_life_days),
          updated_at       = NOW()
      WHERE inward_id = ${req.params.id}
      RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Inward record not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function importSfgInward(req, res) {
  try {
    const { rows } = req.body || {}
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ success: false, error: 'rows array required' })
    let imported = 0, skipped = 0
    const errors = []
    for (const r of rows) {
      const microbe_name  = (r['Microbe Name'] || r.microbe_name || '').toString().trim()
      const microbe_type  = (r['Microbe Type'] || r.microbe_type || '').toString().trim().toUpperCase()
      const cfu           = parseFloat(r['Inhouse CFU/g'] || r.inhouse_cfu_per_g || 0)
      const batchCode     = (r['Biomass Batch Code'] || r.biomass_batch_code || '').toString().trim()
      const harvestDate   = excelDateToIso(r['Date of Harvest'] ?? r.date_of_harvest ?? '')
      const qty           = parseFloat(r['Total Qty (kg)'] || r.total_qty_kg || 0)
      const location      = (r['Location'] || r.location || '').toString().trim() || null
      const moisture      = parseFloat(r['Moisture'] || r.moisture || '') || null
      const shelfLife     = parseInt(r['Shelf Life (days)'] || r.shelf_life_days || '') || null
      const fill          = (r['Fill Status'] || r.fill_status || 'PARTIAL').toString().toUpperCase()
      const containerCode = (r['Container Code'] || r.container_code || '').toString().trim()
      if (!microbe_name || !microbe_type || !cfu || !batchCode || !harvestDate || !qty) {
        skipped++
        const missing = [!microbe_name && 'Microbe Name', !microbe_type && 'Microbe Type', !cfu && 'Inhouse CFU/g', !batchCode && 'Biomass Batch Code', !harvestDate && 'Date of Harvest', !qty && 'Total Qty (kg)'].filter(Boolean).join(', ')
        errors.push({ row: microbe_name || JSON.stringify(r).slice(0, 60), error: `Missing: ${missing}` })
        continue
      }
      try {
        const mRows = await prisma.$queryRaw`SELECT * FROM microbe_master WHERE LOWER(microbe_name) = LOWER(${microbe_name})`
        const microbe = mRows[0]
        const microbeId   = microbe?.microbe_id || null
        const microbeCode = microbe?.microbe_code || microbe_name.replace(/\s+/g, '_').toUpperCase()
        let containerId, resolvedCode = containerCode
        if (containerCode) {
          const cRows = await prisma.$queryRaw`SELECT container_id FROM microbial_sfg_container WHERE container_code = ${containerCode}`
          if (cRows[0]) {
            containerId = cRows[0].container_id
          } else {
            const typeCode = microbe_type.substring(0, 3)
            const newC = await prisma.$queryRaw`INSERT INTO microbial_sfg_container (container_code, microbe_id, microbe_code, microbe_name, microbe_type, type_code, seq_no, location, current_qty_kg, fill_status) VALUES (${containerCode}, ${microbeId}, ${microbeCode}, ${microbe_name}, ${microbe_type}, ${typeCode}, 1, ${location}, ${qty}, ${fill}) ON CONFLICT (container_code) DO UPDATE SET updated_at = NOW() RETURNING container_id`
            containerId = newC[0].container_id
          }
        } else {
          const typeCode = microbe_type.substring(0, 3)
          const seq = await getNextContainerSeq(microbeCode, typeCode)
          resolvedCode = buildContainerCode(microbeCode, typeCode, seq)
          const newC = await prisma.$queryRaw`INSERT INTO microbial_sfg_container (container_code, microbe_id, microbe_code, microbe_name, microbe_type, type_code, seq_no, location, current_qty_kg, fill_status) VALUES (${resolvedCode}, ${microbeId}, ${microbeCode}, ${microbe_name}, ${microbe_type}, ${typeCode}, ${seq}, ${location}, ${qty}, ${fill}) RETURNING container_id`
          containerId = newC[0].container_id
        }
        await prisma.$executeRaw`INSERT INTO microbial_sfg_inward (container_id, container_code, microbe_id, microbe_code, microbe_name, microbe_type, inhouse_cfu_per_g, biomass_batch_code, date_of_harvest, total_qty_kg, remaining_qty_kg, location, moisture, shelf_life_days, fill_status) VALUES (${containerId}, ${resolvedCode}, ${microbeId}, ${microbeCode}, ${microbe_name}, ${microbe_type}, ${cfu}, ${batchCode}, ${harvestDate}::date, ${qty}, ${qty}, ${location}, ${moisture}, ${shelfLife}, ${fill})`
        await prisma.$executeRaw`UPDATE microbial_sfg_container SET current_qty_kg = current_qty_kg + ${qty}, fill_status = ${fill}, updated_at = NOW() WHERE container_id = ${containerId}`
        imported++
      } catch (e) {
        errors.push({ row: microbe_name || JSON.stringify(r).slice(0, 60), error: e.message })
        skipped++
      }
    }
    return res.json({ success: true, imported, skipped, errors })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
