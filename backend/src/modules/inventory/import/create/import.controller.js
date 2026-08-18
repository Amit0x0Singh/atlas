import prisma from '../../../../db.js'
import * as XLSX from 'xlsx'
import { normalizePlant } from '../../../../utils/plant.js'
import { syncTotalRecipe } from '../../../production/recipe/recipe-utils.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'
import { getMaxMicrobeCodeNum, formatMicrobeCode } from '../../../../utils/microbe-code.js'
import { getMaxProductCodeNum, formatProductCode } from '../../../../utils/product-code.js'
import { getMaxEquipCodeNum, formatEquipCode } from '../../../../utils/equip-code.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

function col(row, ...keys) {
  for (const key of keys) {
    for (const k of Object.keys(row)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(key.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        const val = row[k]
        if (val !== null && val !== undefined && String(val).trim() !== '') return String(val).trim()
      }
    }
  }
  return ''
}

// col()'s substring match makes "category" also match a "Sub-Category"
// header (since "subcategory" contains "category") — this does an exact
// match after stripping instead, so the two never get confused for each other.
function colExact(row, key) {
  const target = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const k of Object.keys(row)) {
    if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === target) {
      const val = row[k]
      if (val !== null && val !== undefined && String(val).trim() !== '') return String(val).trim()
    }
  }
  return ''
}

function safeNum(val) {
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

// Equipment "Working Volume" is often one cell with the unit inlined
// (e.g. "50 Kg", "2500 L") rather than a separate unit column — split the
// leading number from the trailing unit word instead of just stripping it.
function parseWorkingVolume(val) {
  const str = String(val || '').trim()
  const m = str.match(/^([\d.,]+)\s*([a-zA-Z]+)?/)
  if (!m) return { qty: 0, unit: null }
  return { qty: parseFloat(m[1].replace(/,/g, '')) || 0, unit: m[2] ? m[2].toUpperCase() : null }
}

// One Gate Inward per unique supplier+invoice+received-date group in the
// Print Master sheet — matched on the same triple before creating a new one,
// so re-importing the same sheet (or an Inward-sheet follow-up pass) doesn't
// spawn duplicate gate entries.
async function findOrCreateImportGateInward(supplier, invoiceNo, receivedDate) {
  const supplierName = supplier || 'Unknown Supplier'
  const dayRange = receivedDate ? {
    gte: new Date(receivedDate.getFullYear(), receivedDate.getMonth(), receivedDate.getDate()),
    lt:  new Date(receivedDate.getFullYear(), receivedDate.getMonth(), receivedDate.getDate() + 1),
  } : undefined

  // supplierName is stored lowercase (RULES.LOWER) but Excel import rows
  // carry whatever casing the sheet happened to use — match case-
  // insensitively so re-importing under a differently-cased supplier name
  // still finds the existing gate entry instead of creating a duplicate.
  const existing = await prisma.gateInward.findFirst({
    where: { supplierName: { equals: supplierName, mode: 'insensitive' }, invoiceNo: invoiceNo || null, ...(dayRange ? { entryTime: dayRange } : {}) },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return existing

  return prisma.gateInward.create({
    data: { supplierName, invoiceNo: invoiceNo || null, status: 'approved', entryTime: receivedDate || new Date() },
  })
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 864e5))
    if (!isNaN(d)) return d
  }
  const d = new Date(val)
  return isNaN(d) ? null : d
}

function normalizeEquipSection(loc) {
  if (!loc) return ''
  const l = String(loc).toLowerCase().trim()
  if (l.includes('botanical'))                              return 'BOTANICAL'
  if (l.includes('liquid'))                                 return 'LIQUID'
  if (l.includes('granule'))                                return 'GRANULES'
  if (l.includes('microbial') || l.includes('production'))  return 'MICROBIAL'
  if (l === 'nano' || l.includes('nano'))                   return 'NANO'
  if (l.includes('powder') || l.includes('formulation'))    return 'POWDER'
  return String(loc).toUpperCase().trim()
}

function normalizeRecipePlant(plant) {
  if (!plant) return ''
  const p = String(plant).toUpperCase().trim()
  if (p.startsWith('MPFU'))       return 'POWDER'
  if (p === 'BOTANICAL')          return 'BOTANICAL'
  if (p === 'NANO')               return 'NANO'
  if (p === 'LIQUID')             return 'LIQUID'
  if (p === 'GRANULES')           return 'GRANULES'
  if (p === 'POWDER')             return 'POWDER'
  return p
}

function getRoleType(concCfu) {
  if (!concCfu) return null
  const v = String(concCfu).trim().toUpperCase()
  if (['NA', 'N/A', 'NIL', '-', '', 'NONE'].includes(v)) return null
  return 'MICROBE'
}

// A Recipe/BOM sheet (Product + Recipe Item/Raw Material + Qty columns) can
// also carry a bare "Microbe" Yes/No flag column — which, on its own, is
// exactly what the Microbe Master column-signature fallback below looks for.
// Without this check, a recipe sheet gets *also* misread as a Microbe Master
// sheet, treating unrelated columns (e.g. Product Name) as microbe names.
function isRecipeShapedHeaders(headers) {
  const hasProd = headers.some(h => h.includes('product'))
  const hasItem = headers.some(h => h === 'rawmaterial' || (h.includes('raw') && h.includes('material')) || h.includes('ingredient') || h.includes('recipeitem'))
  const hasQty = headers.some(h => h.includes('qty') || h.includes('quantity'))
  return hasProd && hasItem && hasQty
}

const nextRmCode = async (existingCodes) => {
  const allCodes = await prisma.rmMaster.findMany({ select: { itemCode: true } })
  const dbNums = allCodes.map(p => parseInt(p.itemCode.replace(/\D/g, ''))).filter(n => !isNaN(n))
  const localNums = existingCodes.map(c => parseInt(c.replace(/\D/g, ''))).filter(n => !isNaN(n))
  const max = Math.max(0, ...dbNums, ...localNums)
  return `RM-${String(max + 1).padStart(3, '0')}`
}

export const previewImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded', code: 'VALIDATION_ERROR' })
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const summary = {}
    const detectedAs = {}

    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      summary[name] = { rowCount: rows.length, columns, sample: rows.slice(0, 3) }

      // Tag each sheet with what it will be imported as
      const n = name.toLowerCase()
      const fileName = req.file.originalname || ''
      const fileHasBom = /recipe|bom|bill.?of.?material|formula/i.test(fileName)
      const headers = columns.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))

      if (/supplier|vendor/i.test(n)) detectedAs[name] = 'Supplier Master'
      else if (/microbe/i.test(n)) detectedAs[name] = 'Microbe Master'
      else if (/product/i.test(n) && !/print|pack|recipe|bom|formula|rm|material|equipment|equip/i.test(n)) detectedAs[name] = 'Product Master'
      else if (/equipment|equip/i.test(n)) detectedAs[name] = 'Equipment Master'
      else if (/rm|material|raw.?mat/i.test(n) && !/print|pack|inward|outward|recipe|bom|product/i.test(n)) detectedAs[name] = 'RM Master'
      else if (/recipe|bom|bill.?of.?material|formula/i.test(n)) detectedAs[name] = 'Recipe / BOM'
      else if (/print|pack.?master/i.test(n)) detectedAs[name] = 'Print Master'
      else if (/inward|goods.?received|grn|receipt/i.test(n)) detectedAs[name] = 'Inward'
      else if (/outward|issuance|issue|dispatch/i.test(n)) detectedAs[name] = 'Outward'
      else {
        // Column-based BOM detection (product + raw material + qty)
        const hasProd = headers.some(h => h.includes('product'))
        const hasRawMat = headers.some(h => h === 'rawmaterial' || (h.includes('raw') && h.includes('material')) || h.includes('ingredient') || h.includes('recipeitem'))
        const hasQty = headers.some(h => h.includes('qty') || h.includes('quantity'))
        if (hasProd && hasRawMat && hasQty) {
          detectedAs[name] = fileHasBom ? 'Recipe / BOM (auto-detected — filename match)' : 'Recipe / BOM (auto-detected by columns)'
        } else if (headers.some(h => h.includes('suppliername') || h.includes('vendorname'))) {
          detectedAs[name] = 'Supplier Master (auto-detected by columns)'
        } else if (headers.some(h => h.includes('equipname') || h.includes('equipmentname') || h.includes('workcenter'))) {
          detectedAs[name] = 'Equipment Master (auto-detected by columns)'
        } else if (headers.some(h => h.includes('microbename')) || headers.includes('microbe')) {
          detectedAs[name] = 'Microbe Master (auto-detected by columns)'
        } else {
          // Column-based RM auto-detection
          const hasCode = headers.some(h => h.includes('code') || h.includes('itemcode') || h.includes('itemno') || h.includes('srno'))
          const hasName = headers.some(h => h.includes('name') || h.includes('itemname') || h.includes('description'))
          if (hasCode && hasName) detectedAs[name] = 'RM Master (auto-detected by columns)'
          else detectedAs[name] = '⚠️ Not recognized — will be skipped'
        }
      }
    }

    return res.json({ success: true, data: { sheets: wb.SheetNames, summary, detectedAs, totalSheets: wb.SheetNames.length } })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}

export const executeImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded', code: 'VALIDATION_ERROR' })
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })

    const results = {
      rmMaster: 0, productMaster: 0, equipmentMaster: 0, supplierMaster: 0,
      microbeMaster: 0,
      recipeBom: 0, printMaster: 0, inward: 0, outward: 0,
      unmatchedRm: 0,
      errors: []
    }

    // Shared running counters for backend-assigned codes — product creates
    // happen in two separate loops below (direct Product sheet + recipe
    // auto-create), so the counter is tracked once here rather than re-read
    // per loop (which would hand out the same code twice within one import).
    let nextProductNum = await getMaxProductCodeNum(prisma)
    let nextEquipNum = await getMaxEquipCodeNum(prisma)

    // ── SUPPLIER MASTER ────────────────────────────────────────────────────
    // Sheet-name match first; falls back to column-signature detection (a
    // "Supplier Name"/"Vendor Name" header) for files where the tab was
    // never renamed from the spreadsheet tool's default ("Sheet1" etc).
    let supplierSheet = wb.SheetNames.find(s => /supplier|vendor/i.test(s))
    if (!supplierSheet) {
      supplierSheet = wb.SheetNames.find(s => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
        if (!rows.length) return false
        const headers = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
        return headers.some(h => h.includes('suppliername') || h.includes('vendorname'))
      })
    }
    if (supplierSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[supplierSheet], { defval: '' })
      for (const row of rows) {
        try {
          const supplierName = col(row, 'suppliername', 'supplier name', 'supplier_name', 'vendorname', 'vendor name', 'name')
          const gstin = col(row, 'gstin', 'gst no', 'gst number') || null
          const phone = col(row, 'phone', 'contact', 'mobile', 'phone no') || null
          const email = col(row, 'email', 'email id') || null
          const address = col(row, 'address') || null
          if (!supplierName) continue
          const existing = await prisma.erpSupplier.findFirst({ where: { supplierName: { equals: supplierName, mode: 'insensitive' } } })
          if (existing) {
            await prisma.erpSupplier.update({
              where: { supplierId: existing.supplierId },
              data: { gstin: gstin ?? existing.gstin, phone: phone ?? existing.phone, email: email ?? existing.email, address: address ?? existing.address },
            })
          } else {
            await prisma.erpSupplier.create({ data: { supplierName, gstin, phone, email, address } })
          }
          results.supplierMaster++
        } catch (e) { results.errors.push(`Supplier row: ${e.message}`) }
      }
    }

    // ── MICROBE MASTER ─────────────────────────────────────────────────────
    // Sheet-name match first; falls back to column-signature detection (an
    // exact "Microbe" or "Microbe Name" header) for files where the tab was
    // never renamed from the spreadsheet tool's default ("Sheet1" etc).
    // colExact() for the bare "Microbe" header specifically — a substring
    // match on "microbe" would also match "Microbe Code" and grab the wrong
    // column, since both headers contain that substring.
    // microbe_code is never read from the sheet, even if the sheet has one —
    // computed from MAX(existing)+1, same rule as the interactive "Add
    // Microbe" form (see backend/src/utils/microbe-code.js).
    let microbeSheet = wb.SheetNames.find(s => /microbe/i.test(s))
    if (!microbeSheet) {
      microbeSheet = wb.SheetNames.find(s => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
        if (!rows.length) return false
        const headers = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
        if (isRecipeShapedHeaders(headers)) return false
        return headers.some(h => h.includes('microbename')) || headers.includes('microbe')
      })
    }
    if (microbeSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[microbeSheet], { defval: '' })
      let nextMicrobeNum = await getMaxMicrobeCodeNum(prisma)
      for (const row of rows) {
        try {
          const microbeName = colExact(row, 'microbe') || col(row, 'microbename', 'microbe name', 'name', 'species')
          const rawUom = col(row, 'uom', 'unit', 'unit of measure') || 'KG'
          if (!microbeName) continue
          const canonicalUom = normalizeUom(rawUom)
          if (!CANONICAL_UNITS.includes(canonicalUom)) {
            results.errors.push(`Microbe row "${microbeName}": unknown uom "${rawUom}" — must convert to one of ${CANONICAL_UNITS.join(', ')}`)
            continue
          }
          const existing = await prisma.microbeMaster.findFirst({ where: { microbeName: { equals: microbeName, mode: 'insensitive' } } })
          if (existing) {
            await prisma.microbeMaster.update({ where: { microbeId: existing.microbeId }, data: { uom: canonicalUom } })
          } else {
            nextMicrobeNum++
            await prisma.microbeMaster.create({ data: { microbeName, microbeCode: formatMicrobeCode(nextMicrobeNum), uom: canonicalUom } })
          }
          results.microbeMaster++
        } catch (e) { results.errors.push(`Microbe row: ${e.message}`) }
      }
    }

    // ── PRODUCT MASTER ────────────────────────────────────────────────────
    const prodSheet = wb.SheetNames.find(s =>
      /product/i.test(s) && !/print|pack|recipe|bom|formula|rm|material|equipment|equip/i.test(s)
    )
    if (prodSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[prodSheet], { defval: '' })
      for (const row of rows) {
        try {
          const productCode = col(row, 'productcode', 'product code', 'prod code', 'code')
          const productName = col(row, 'productname', 'product name', 'name', 'prod name')
          // "unit" is deliberately not a fallback key here — it substring-matches
          // headers like "Qty/Unit" or "Qty Per Unit" and previously leaked a
          // quantity value into this product's plant field (e.g. plant "0.14").
          const plant = normalizePlant(col(row, 'plant', 'location'))
          if (!productName) continue
          const existing = await prisma.productMaster.findFirst({ where: { productName: { equals: productName, mode: 'insensitive' } } })
          if (existing) {
            await prisma.productMaster.update({ where: { productCode: existing.productCode }, data: { plant } })
            results.productMaster++
            continue
          }
          if (productCode) {
            // Sheet supplied an explicit code — honor it.
            await prisma.productMaster.upsert({
              where: { productCode },
              create: { productCode, productName, plant },
              update: { productName, plant }
            })
          } else {
            // No code in the sheet — backend assigns one (PR00001-style),
            // same convention as the Add New Product UI.
            nextProductNum++
            await prisma.productMaster.create({ data: { productCode: formatProductCode(nextProductNum), productName, plant } })
          }
          results.productMaster++
        } catch (e) { results.errors.push(`Product row: ${e.message}`) }
      }
    }

    // ── EQUIPMENT MASTER ──────────────────────────────────────────────────
    // Sheet-name match first; falls back to column-signature detection (an
    // "Equipment Name"/"Work Center Name" header) for files where the tab
    // was never renamed from the spreadsheet tool's default ("Sheet1" etc).
    let equipSheet = wb.SheetNames.find(s => /equipment|equip/i.test(s))
    if (!equipSheet) {
      equipSheet = wb.SheetNames.find(s => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
        if (!rows.length) return false
        const headers = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
        return headers.some(h => h.includes('equipname') || h.includes('equipmentname') || h.includes('workcenter'))
      })
    }
    if (equipSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[equipSheet], { defval: '' })
      for (const row of rows) {
        try {
          const equipName = col(row, 'equipname', 'equip name', 'equipment name', 'name', 'equipment', 'machine', 'reactor', 'work center', 'workcenter', 'asset')
          // "unit" is deliberately not a fallback key, and "designated" was
          // dropped now that "Designated Product" is its own real column
          // (below) — both collide with headers meant for other fields.
          const locationRaw = col(row, 'plant', 'location', 'section', 'area', 'department')
          const plant = normalizeEquipSection(locationRaw)
          const workingVolumeRaw = col(row, 'workingvolume', 'working volume', 'volume', 'capacity', 'vol', 'size')
          // Working Volume often carries its unit inline ("50 Kg", "2500 L")
          // rather than in a separate column — split qty from unit instead of
          // just stripping the unit text away.
          const { qty: workingVolume, unit: workingUnit } = parseWorkingVolume(workingVolumeRaw)
          const operation = col(row, 'operation', 'operations', 'process', 'type', 'activity') || ''
          const designatedProduct = col(row, 'designatedproduct', 'designated product', 'designated_product') || null
          if (!equipName) continue
          const existingEquip = await prisma.equipmentMaster.findFirst({ where: { equipName: { equals: equipName, mode: 'insensitive' } } })
          if (existingEquip) {
            await prisma.equipmentMaster.update({
              where: { equipName: existingEquip.equipName },
              data: { plant, workingVolume, workingUnit, operation, designatedProduct }
            })
          } else {
            // equip_code is never read from the sheet — backend assigns it
            // (EP00001-style), same convention as the Add Equipment UI.
            nextEquipNum++
            await prisma.equipmentMaster.create({
              data: { equipCode: formatEquipCode(nextEquipNum), equipName, plant, workingVolume, workingUnit, operation, designatedProduct }
            })
          }
          results.equipmentMaster++
        } catch (e) { results.errors.push(`Equipment row: ${e.message}`) }
      }
    } else {
      results.errors.push('ℹ️ No Equipment sheet found — sheet tab must contain "equipment" or "equip".')
    }

    // ── RM MASTER ─────────────────────────────────────────────────────────
    // 1. Try sheet-name detection first
    let rmSheet = wb.SheetNames.find(s =>
      /rm|material|raw.?mat/i.test(s) && !/print|pack|inward|outward|recipe|bom|product/i.test(s)
    )

    // 2. Fallback: auto-detect by column headers (catches "Sheet1" etc.)
    if (!rmSheet) {
      const alreadyClaimed = new Set([prodSheet, equipSheet].filter(Boolean))
      rmSheet = wb.SheetNames.find(s => {
        if (alreadyClaimed.has(s)) return false
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
        if (!rows.length) return false
        const headers = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
        const hasCode = headers.some(h => h.includes('code') || h.includes('itemcode') || h.includes('itemno') || h.includes('srno'))
        const hasName = headers.some(h => h.includes('name') || h.includes('itemname') || h.includes('description') || h.includes('material'))
        return hasCode && hasName
      })
      if (rmSheet) {
        results.errors.push(`ℹ️ RM sheet auto-detected: "${rmSheet}" (tip: name it "RM Master" to avoid this message)`)
      }
    }

    if (rmSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[rmSheet], { defval: '' })
      for (const row of rows) {
        try {
          const itemCode = col(row, 'itemcode', 'item code', 'item_code', 'code', 'rm code', 'material code', 'mat code', 'part no', 'partno', 'sr no', 'srno', 'no')
          const itemName = col(row, 'itemname', 'item name', 'item_name', 'name', 'rm name', 'material name', 'description', 'desc', 'particulars', 'material')
          // Item Name + Item Code are the only hard requirements — everything
          // else below defaults instead of failing, per the agreed import
          // contract for this sheet.
          const category = colExact(row, 'category') || 'None'
          const subCategory = col(row, 'subcategory', 'sub category', 'sub_category', 'sub-category') || 'None'
          // "Inventory UOM" and "Operational UOM" both contain "uom" as a
          // substring, and Inventory UOM sits in an earlier column — matching
          // the full phrase first (falling back to a bare "UOM" header for
          // older single-uom-column sheets) keeps the two apart, same fix as
          // Product UOM / Recipe UOM in the Recipe import above.
          const inventoryUomRaw = col(row, 'inventory uom', 'inventoryuom') || colExact(row, 'uom') || col(row, 'unit', 'unit of measure', 'unit of meas')
          const inventoryUom = inventoryUomRaw || 'NOS'
          const operationalUomRaw = col(row, 'operational uom', 'operationaluom', 'operation uom', 'operationuom')
          const operationalUom = operationalUomRaw || 'NOS'
          const conversionRequiredRaw = col(row, 'conversion required', 'conversionrequired')
          const conversionRequired = /^(y|yes|true|1)$/i.test((conversionRequiredRaw || 'no').trim())
          // "Conversion Factor" on this sheet IS density (kg per liter) — the
          // same field the RM Master UI already exposes, used to convert a
          // liquid item between KG and L at issuance. Not a separate concept.
          const density = safeNum(col(row, 'conversion factor', 'conversionfactor'))
          if (!itemCode || !itemName) {
            results.errors.push(`⛔ Skipped row — missing ${!itemName ? 'Item Name' : ''}${!itemName && !itemCode ? ' and ' : ''}${!itemCode ? 'Item Code' : ''} (name: "${itemName || ''}", code: "${itemCode || ''}")`)
            continue
          }
          await prisma.rmMaster.upsert({
            where: { itemCode },
            create: { itemCode, itemName, inventoryUom, operationalUom, category, subCategory, conversionRequired, density },
            update: { itemName, inventoryUom, operationalUom, category, subCategory, conversionRequired, density }
          })
          results.rmMaster++
        } catch (e) { results.errors.push(`RM row: ${e.message}`) }
      }
    }

    // ── RECIPE / BOM ──────────────────────────────────────────────────────
    const bomClaimed = new Set([prodSheet, equipSheet, rmSheet].filter(Boolean))

    let recipeSheet = wb.SheetNames.find(s => /recipe|bom|bill.?of.?material|formula/i.test(s))

    // Fallback 1: filename contains bom/recipe/formula
    if (!recipeSheet) {
      const fileName = req.file.originalname || ''
      if (/recipe|bom|bill.?of.?material|formula/i.test(fileName)) {
        recipeSheet = wb.SheetNames.find(s => {
          if (bomClaimed.has(s)) return false
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
          if (!rows.length) return false
          const hdrs = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
          return hdrs.some(h => h.includes('product')) &&
                 hdrs.some(h => h === 'rawmaterial' || (h.includes('raw') && h.includes('material')) || h.includes('ingredient') || h.includes('recipeitem')) &&
                 hdrs.some(h => h.includes('qty') || h.includes('quantity'))
        })
        if (recipeSheet) results.errors.push(`ℹ️ BOM sheet auto-detected from filename: "${recipeSheet}" (tip: name the sheet tab "BOM" next time)`)
      }
    }

    // Fallback 2: column-signature detection (product + raw material + qty)
    if (!recipeSheet) {
      recipeSheet = wb.SheetNames.find(s => {
        if (bomClaimed.has(s)) return false
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' })
        if (!rows.length) return false
        const hdrs = Object.keys(rows[0]).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
        return hdrs.some(h => h.includes('product')) &&
               hdrs.some(h => h === 'rawmaterial' || (h.includes('raw') && h.includes('material')) || h.includes('ingredient') || h.includes('recipeitem')) &&
               hdrs.some(h => h.includes('qty') || h.includes('quantity'))
      })
      if (recipeSheet) results.errors.push(`ℹ️ BOM sheet auto-detected by columns: "${recipeSheet}" (tip: name the sheet tab "BOM" next time)`)
    }

    if (recipeSheet && !rmSheet) {
      results.errors.push('⚠️ No RM sheet found. Name your sheet "RM Master" or "Raw Material" and ensure it has Item Code + Item Name columns.')
    }

    if (recipeSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[recipeSheet], { defval: '' })
      const productsByName = {}
      const existingProducts = await prisma.productMaster.findMany()
      existingProducts.forEach(p => { productsByName[p.productName.toLowerCase()] = p })
      const rmsByName = {}
      const existingRms = await prisma.rmMaster.findMany()
      existingRms.forEach(r => { rmsByName[r.itemName.toLowerCase()] = r })
      // A "Recipe Item" isn't always a raw material — it can be a microbe
      // (biological ingredient, code lives in Microbe Master) or another
      // product used as a semi-finished good (code lives in Product Master).
      // Previously only RM Master was checked here, so every microbe row
      // fell through to the "unmatched" NaN-placeholder path even though the
      // microbe genuinely existed — this map lets those resolve properly.
      const microbesByName = {}
      const existingMicrobes = await prisma.microbeMaster.findMany()
      existingMicrobes.forEach(m => { microbesByName[m.microbeName.toLowerCase()] = m })

      // Every recipe row must land in the DB — even one recipe_db has a
      // @@unique([productCode, recipeNo, rmCode]) constraint, so a product with
      // more than one unmatched ingredient can't literally store "NaN" twice.
      // First unmatched ingredient in a product gets "NaN", the next "NaN-2",
      // etc. — still trivially recognizable as unmatched (rmCode starts with
      // "NaN"), and picked up automatically by the existing Fix RM Mapping /
      // recipe-drift-sync tools since neither is a real RM Master code.
      const nanCounters = {} // productCode -> highest NaN suffix used so far
      async function nextNanCode(productCode) {
        if (nanCounters[productCode] === undefined) {
          const existing = await prisma.recipeDb.findMany({
            where: { productCode, rmCode: { startsWith: 'NaN' } },
            select: { rmCode: true },
          })
          let max = 0
          existing.forEach(r => {
            const m = /^NaN(?:-(\d+))?$/.exec(r.rmCode)
            if (m) max = Math.max(max, m[1] ? parseInt(m[1], 10) : 1)
          })
          nanCounters[productCode] = max
        }
        nanCounters[productCode]++
        const n = nanCounters[productCode]
        return n === 1 ? 'NaN' : `NaN-${n}`
      }

      // Keyed by productCode||rmCode — recipe_db has a @@unique constraint on
      // that pair, so two source rows for the same product+ingredient (a
      // duplicate line in the spreadsheet, or the same unmatched name typed
      // twice) both resolve to the *same* row and the second is an update,
      // not a new insert. Counting every processed row (the old behavior)
      // over-reports vs. what's actually in the table — e.g. "2176 Recipe/BOM
      // Lines" imported when the DB only gained 2142 rows. Tracking the last
      // write per key and deriving all summary counts from this map's size
      // afterward keeps the reported numbers honest.
      const touchedRecipeRows = new Map()

      for (const row of rows) {
        try {
          // Bare 'product' is deliberately not a col() substring key here — it
          // would also match this same sheet's "Product UOM" column (which
          // contains "product" too) and leak a unit like "kg" in as the
          // product name whenever Product Name itself was left blank.
          // colExact still allows a plain "Product" header (no other column
          // normalizes to exactly that) without that risk.
          const productName = col(row, 'productname', 'product name', 'finished good', 'fg name') || colExact(row, 'product')
          // "Recipe Items" is this sheet format's ingredient-name column —
          // checked alongside the older "Raw Material"/"Ingredient" headers
          // so both formats resolve to the same field.
          const rmName = col(row, 'recipeitems', 'recipe items', 'rawmaterial', 'raw material', 'rm name', 'material name', 'ingredient', 'component name', 'component', 'rm')
          // Product Name + Recipe Item are the only hard requirements — a row
          // missing either genuinely can't be placed in a recipe and is skipped.
          // Everything else below has an explicit default instead of being
          // left blank/flagged, per the agreed import contract for this sheet.
          const qtyPerUnit = safeNum(col(row, 'qty', 'qtyperunit', 'qty per unit', 'quantity', 'qty/unit', 'qty per kg'))
          // "Product UOM" and "Recipe UOM" both contain "uom" as a substring,
          // and Product UOM sits in an earlier column — a plain col(row,'uom')
          // lookup would grab Product UOM's value for the recipe line instead.
          // Matching the full "recipe uom" phrase first (falling back to a
          // bare "UOM" header for older single-uom-column sheets) keeps the
          // two apart.
          const recipeUomRaw = col(row, 'recipe uom', 'recipeuom') || colExact(row, 'uom') || col(row, 'unit', 'unit of measure')
          const uom = recipeUomRaw || 'NOS'
          const productUomRaw = col(row, 'product uom', 'productuom')
          let canonicalProductUom = null
          if (productUomRaw) {
            const normalized = normalizeUom(productUomRaw)
            if (CANONICAL_UNITS.includes(normalized)) canonicalProductUom = normalized
            else results.errors.push(`⚠️ Product "${productName || '?'}": unrecognized Product UOM "${productUomRaw}" — left unset`)
          }
          const plantRaw = col(row, 'plant', 'location', 'section')
          const section = normalizeRecipePlant(plantRaw)
          // Explicit "Microbe" Yes/No column is the source of truth for this
          // sheet format; the older Conc/CFU-presence heuristic (getRoleType)
          // is kept as a fallback OR so pre-existing sheets without a Microbe
          // column still classify correctly.
          const microbeFlag = colExact(row, 'microbe') || col(row, 'is microbe', 'ismicrobe')
          const isMicrobe = /^(y|yes|true|1)$/i.test((microbeFlag || 'no').trim())
          const cfuPerG = safeNum(col(row, 'cfu/g', 'cfug', 'cfu per g', 'cfu'))
          const concCfu = col(row, 'conc', 'cfu', 'concentration', 'conccfu', 'concfcu')
          const roleType = (isMicrobe || getRoleType(concCfu)) ? 'MICROBE' : 'INGREDIENT'
          if (!productName || !rmName) {
            results.skippedMissingProductOrRm = (results.skippedMissingProductOrRm || 0) + 1
            results.errors.push(`⛔ Skipped row — missing ${!productName ? 'Product Name' : ''}${!productName && !rmName ? ' and ' : ''}${!rmName ? 'Recipe Item' : ''} (product: "${productName || ''}", item: "${rmName || ''}")`)
            continue
          }

          // Product: auto-create if not in master (products come from BOM).
          // plant is an array — a product's ingredients can each come from a
          // different plant, so every new, distinct plant seen across this
          // product's rows is appended rather than overwriting the others.
          let product = productsByName[productName.toLowerCase()]
          if (!product) {
            // No code to honor here — recipe sheets never carry one, so the
            // backend assigns a PR00001-style code the same way the direct
            // Product Master import path does above.
            nextProductNum++
            product = await prisma.productMaster.create({ data: { productCode: formatProductCode(nextProductNum), productName, plant: normalizePlant(section), uom: canonicalProductUom } })
            productsByName[productName.toLowerCase()] = product
            results.productMaster++
          } else {
            const productUpdate = {}
            if (section && !product.plant.includes(section)) productUpdate.plant = { push: section }
            if (!product.uom && canonicalProductUom) productUpdate.uom = canonicalProductUom
            if (Object.keys(productUpdate).length) {
              product = await prisma.productMaster.update({ where: { productCode: product.productCode }, data: productUpdate })
              productsByName[productName.toLowerCase()] = product
            }
          }

          // Exact name match only (case-insensitive, trimmed) — no fuzzy
          // matching here. Fuzzy matching risks silently assigning the WRONG
          // item code (seen in testing: "Totally Fake Ingredient Alpha" fuzzy-
          // matched "Alpha Amylase- Liquid" at 80% confidence — clearly not
          // the same thing), which is worse than leaving it for manual review.
          // The recipe's own typed name is NEVER rewritten either way — only
          // the resolved Item Code differs; an unmatched ingredient keeps its
          // original name and gets rmCode "NaN" (or "NaN-2", "NaN-3"... within
          // the same product) instead of being silently dropped, so 100% of
          // BOM lines still make it into recipe_db, reconcilable later via
          // Fix RM Mapping.
          //
          // Checked in this order: Microbe Master first — an actual name
          // match there is a stronger, authoritative signal that the row is
          // a microbe than the manually-typed "Microbe" Yes/No column, so it
          // wins even if that column was left blank/No. Then RM Master, then
          // Product Master (the ingredient is itself an SFG built from
          // another BOM). Only if none of the three match does the row fall
          // back to a "NaN" placeholder.
          const rm = rmsByName[rmName.toLowerCase()]
          const microbeMatch = microbesByName[rmName.toLowerCase()]
          const sfgMatch = productsByName[rmName.toLowerCase()]
          let rmCode
          let matchedMicrobeCode = null
          let resolvedIsMicrobe = isMicrobe
          const unmatched = !rm && !microbeMatch && !sfgMatch
          if (microbeMatch) {
            rmCode = microbeMatch.microbeCode
            matchedMicrobeCode = microbeMatch.microbeCode
            resolvedIsMicrobe = true
          } else if (rm) {
            rmCode = rm.itemCode
          } else if (sfgMatch && sfgMatch.productCode !== product.productCode) {
            rmCode = sfgMatch.productCode
          } else {
            // Reuse the same placeholder on a re-import of the same file,
            // instead of minting a fresh NaN-n every time.
            const existingNanRow = await prisma.recipeDb.findFirst({
              where: { productCode: product.productCode, rmName, rmCode: { startsWith: 'NaN' } },
            })
            rmCode = existingNanRow ? existingNanRow.rmCode : await nextNanCode(product.productCode)
          }

          const finalRoleType = (resolvedIsMicrobe || getRoleType(concCfu)) ? 'MICROBE' : (roleType || 'INGREDIENT')
          await prisma.recipeDb.upsert({
            where: { productCode_recipeNo_rmCode: { productCode: product.productCode, recipeNo: 1, rmCode } },
            create: { productCode: product.productCode, productName: product.productName, rmCode, rmName, qtyPerUnit, uom, roleType: finalRoleType, isMicrobe: resolvedIsMicrobe, microbeCode: matchedMicrobeCode, requiredCfu: cfuPerG },
            update: { qtyPerUnit, uom, productName: product.productName, rmName, roleType: finalRoleType, isMicrobe: resolvedIsMicrobe, microbeCode: matchedMicrobeCode, requiredCfu: cfuPerG }
          })

          // Last occurrence of a duplicate key wins here, matching the
          // upsert's own "last write wins" semantics — the counts and error
          // list below reflect actual distinct rows, not raw source lines.
          // occurrences tracks how many source rows collapsed into this one
          // DB row, so a genuine duplicate line in the sheet is visible
          // afterward instead of silently vanishing into the total.
          const dupKey = `${product.productCode}||${rmCode}`
          const prevOccurrences = touchedRecipeRows.get(dupKey)?.occurrences || 0
          touchedRecipeRows.set(dupKey, {
            productName, rmName, rmCode, unmatched,
            occurrences: prevOccurrences + 1,
          })
        } catch (e) { results.errors.push(`Recipe row: ${e.message}`) }
      }

      results.recipeBom = touchedRecipeRows.size
      results.duplicateRecipeLines = []
      for (const v of touchedRecipeRows.values()) {
        if (v.unmatched) {
          results.unmatchedRm = (results.unmatchedRm || 0) + 1
          results.errors.push(`❌ Ingredient not found in RM Master, Microbe Master, or Product Master: "${v.rmName}" (product: ${v.productName}) — imported with item code "${v.rmCode}"; add it to the correct master with this exact name, then use Fix RM Mapping to reconcile`)
        }
        // A source row count > 1 for the same product+ingredient means the
        // sheet itself repeats that line — recipe_db can only hold one qty
        // per (product, ingredient), so these collapsed and only the LAST
        // occurrence's qty/uom was kept. Surfaced explicitly so "sheet had
        // 2176 rows, DB has 2142" is traceable to specific rows instead of
        // looking like silently lost data.
        if (v.occurrences > 1) {
          results.duplicateRecipeLines.push({ productName: v.productName, rmName: v.rmName, occurrences: v.occurrences })
        }
      }
      if (results.duplicateRecipeLines.length > 0) {
        const extraRows = results.duplicateRecipeLines.reduce((s, d) => s + (d.occurrences - 1), 0)
        results.duplicateRecipeLineExtraRows = extraRows
        results.errors.push(`🔁 ${results.duplicateRecipeLines.length} product+ingredient combo(s) appeared more than once in the sheet (${extraRows} extra row(s) total) — only the last occurrence's qty/uom was kept per combo, e.g.: ${results.duplicateRecipeLines.slice(0, 5).map(d => `"${d.rmName}" in "${d.productName}" (×${d.occurrences})`).join(', ')}${results.duplicateRecipeLines.length > 5 ? ', …' : ''}`)
      }
      const touchedProductCodes = new Set([...touchedRecipeRows.values()].map(v => productsByName[v.productName?.toLowerCase()]?.productCode).filter(Boolean))
      for (const productCode of touchedProductCodes) await syncTotalRecipe(productCode)
    }

    // ── PRINT MASTER ───────────────────────────────────────────────────────
    // Sheet rows are per-bag (old flat shape). Print Master headers now
    // require a gateInwardId, so rows are grouped by supplier+invoice+
    // received-date to find-or-create one Gate Inward entry per group, then
    // grouped again by item+lot to find-or-create one Print Master header
    // per group — mirroring what the live /packs/generate endpoint does.
    const pmSheet = wb.SheetNames.find(s => /print|pack.?master/i.test(s))
    if (pmSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[pmSheet], { defval: '' })
      const gateInwardCache = new Map()
      const headerCache = new Map()

      for (const row of rows) {
        try {
          const packId   = col(row, 'pack id', 'packid', 'pack_id')
          const itemCode = col(row, 'item code', 'itemcode', 'item_code')
          const itemName = col(row, 'item name', 'itemname', 'item_name')
          const lotNo    = col(row, 'lot no', 'lotno', 'lot_no', 'batch code', 'batchcode') || '2025-001'
          const bagNo    = parseInt(col(row, 'bag no', 'bagno', 'bag_no', 'bag number') || '1') || 1
          const packQty  = safeNum(col(row, 'pack qty', 'packqty', 'pack_qty', 'qty per bag', 'quantity'))
          const uom      = col(row, 'uom', 'unit') || 'KG'
          const supplier = col(row, 'supplier', 'vendor', 'supplier name')
          const invoiceNo = col(row, 'invoice no', 'invoiceno', 'invoice_no', 'invoice number')
          const rdRaw    = col(row, 'received date', 'receiveddate', 'receipt date', 'date received')
          const receivedDate = parseDate(rdRaw)
          if (!packId || !itemCode) continue

          const alreadyBag = await prisma.packDetail.findUnique({ where: { packId } })
          if (alreadyBag) continue

          const rmExists = await prisma.rmMaster.findUnique({ where: { itemCode } })
          if (!rmExists && itemName) {
            await prisma.rmMaster.upsert({ where: { itemCode }, create: { itemCode, itemName, uom }, update: {} })
          }
          const statusRaw = col(row, 'status').toLowerCase()
          const status = statusRaw.includes('inward') || statusRaw === 'inwarded' ? 'INWARDED' : 'AWAITING_INWARD'

          const giKey = `${supplier || ''}||${invoiceNo || ''}||${receivedDate ? receivedDate.toISOString().slice(0, 10) : ''}`
          let gateInwardId = gateInwardCache.get(giKey)
          if (!gateInwardId) {
            const gi = await findOrCreateImportGateInward(supplier, invoiceNo, receivedDate)
            gateInwardId = gi.inwardId
            gateInwardCache.set(giKey, gateInwardId)
          }

          const headerKey = `${itemCode}||${lotNo}`
          let header = headerCache.get(headerKey)
          if (!header) {
            header = await prisma.printMaster.findUnique({ where: { itemCode_lotNo: { itemCode, lotNo } } })
            if (!header) {
              header = await prisma.printMaster.create({
                data: { gateInwardId, itemCode, itemName: itemName || itemCode, lotNo, packQty, uom, numberOfBags: 0 },
              })
            }
            headerCache.set(headerKey, header)
          }

          await prisma.packDetail.create({
            data: { packId, printMasterId: header.id, itemCode, bagNo, totalQty: packQty, remainingQty: packQty, status },
          })
          await prisma.printMaster.update({ where: { id: header.id }, data: { numberOfBags: { increment: 1 } } })

          results.printMaster++
        } catch (e) { results.errors.push(`Pack row: ${e.message}`) }
      }
    }

    // ── INWARD ─────────────────────────────────────────────────────────────
    const inSheet = wb.SheetNames.find(s => /inward|goods.?received|grn|receipt/i.test(s))
    if (inSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[inSheet], { defval: '' })
      for (const row of rows) {
        try {
          const packId    = col(row, 'pack id', 'packid', 'pack_id', 'scan')
          const warehouse = col(row, 'warehouse', 'ware house', 'location', 'store') || 'Main Store'
          const dateRaw   = col(row, 'date of inward', 'inward date', 'date', 'received date')
          const inwardTime = parseDate(dateRaw) || new Date()
          if (!packId) continue
          const pack = await prisma.packDetail.findUnique({ where: { packId } })
          if (!pack) { results.errors.push(`Inward: Pack ${packId} not in Print Master`); continue }
          if (pack.status === 'INWARDED') continue
          await prisma.$transaction(async (tx) => {
            await tx.packDetail.update({ where: { packId }, data: { status: 'INWARDED', warehouse, inwardedAt: inwardTime } })
            const prev = await tx.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
            await tx.stockLedger.create({ data: { itemCode: pack.itemCode, sourceId: packId, transactionType: 'INWARD', inQty: pack.totalQty, balance: (prev?.balance || 0) + pack.totalQty, reference: `Import | ${warehouse}` } })
          })
          results.inward++
        } catch (e) { results.errors.push(`Inward row: ${e.message}`) }
      }
    }

    // ── OUTWARD ────────────────────────────────────────────────────────────
    const outSheet = wb.SheetNames.find(s => /outward|issuance|issue|dispatch/i.test(s))
    if (outSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[outSheet], { defval: '' })
      for (const row of rows) {
        try {
          const sourceId   = col(row, 'source id', 'sourceid', 'pack id', 'packid', 'scan')
          const txType     = col(row, 'transaction type', 'type', 'tx type') || 'BOM_ISSUANCE'
          const issuedQty  = safeNum(col(row, 'issued qty', 'issuedqty', 'qty', 'quantity issued'))
          const bomNo      = col(row, 'bom no', 'bomno', 'indent', 'indent id')
          const issuedTo   = col(row, 'issued to', 'issuedto', 'department', 'plant', 'dept')
          const remarks    = col(row, 'remarks', 'remark', 'notes')
          const txBy       = col(row, 'transaction made by', 'transacted by', 'done by', 'operator')
          const dateRaw    = col(row, 'date of issue', 'issue date', 'date')
          const timestamp  = parseDate(dateRaw) || new Date()
          const rmCode     = col(row, 'item code', 'itemcode', 'rm code')
          if (!sourceId || issuedQty <= 0) continue
          const txMap = {
            'issued to production': 'BOM_ISSUANCE', 'bom': 'BOM_ISSUANCE',
            'pack reduction': 'PACK_TO_CONTAINER', 'pack to container': 'PACK_TO_CONTAINER',
            'job work': 'JOB_WORK', 'warehouse transfer': 'WAREHOUSE_TRANSFER',
            'stock recon': 'STOCK_RECON', 'adjustment': 'STOCK_RECON',
          }
          const normalizedType = txMap[txType.toLowerCase()] || txType.toUpperCase().replace(/\s+/g, '_')
          await prisma.outward.create({
            data: {
              sourceId, sourceType: normalizedType,
              rmCode: rmCode || sourceId, qtyIssued: issuedQty,
              remarks: [remarks, issuedTo ? `Issued to: ${issuedTo}` : '', txBy ? `By: ${txBy}` : ''].filter(Boolean).join(' | ') || null,
              indentId: bomNo || null, timestamp,
            }
          })
          const pb = await prisma.packDetail.findUnique({ where: { packId: sourceId } })
          if (pb) {
            await prisma.packDetail.update({ where: { packId: sourceId }, data: { remainingQty: Math.max(0, pb.remainingQty - issuedQty) } })
          }
          results.outward++
        } catch (e) { results.errors.push(`Outward row: ${e.message}`) }
      }
    }

    // ── CUSTOMER PROFILE ───────────────────────────────────────────────────
    const cpSheet = wb.SheetNames.find(s => /customer.?profile|customer.?master|client.?list|customers/i.test(s))
    if (cpSheet) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[cpSheet], { defval: '' })
      const profileMap = {}
      for (const row of rows) {
        const name = col(row, 'customer name', 'customername', 'customer', 'name')
        if (!name) continue
        const displayName = name.trim() // stored/looked-up value — case preserved, business name never case-changed
        const key = displayName.toUpperCase() // grouping key only, never stored
        const co  = col(row, 'company', 'co', 'firm') || ''
        const ot  = col(row, 'order type', 'ordertype', 'type') || 'DOMESTIC'
        if (!profileMap[key]) profileMap[key] = { displayName, co: {}, ot: {} }
        profileMap[key].co[co] = (profileMap[key].co[co] || 0) + 1
        profileMap[key].ot[ot] = (profileMap[key].ot[ot] || 0) + 1
      }
      for (const { displayName, co, ot } of Object.values(profileMap)) {
        try {
          const company   = Object.entries(co).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
          const orderType = Object.entries(ot).sort((a, b) => b[1] - a[1])[0]?.[0] || 'DOMESTIC'
          const orderCount = Object.values(co).reduce((a, b) => a + b, 0)
          const existing = await prisma.customerProfile.findFirst({ where: { customerName: { equals: displayName, mode: 'insensitive' } } })
          if (existing) {
            if (orderCount > existing.orderCount) {
              await prisma.customerProfile.update({ where: { customerName: existing.customerName }, data: { company, orderType, orderCount } })
            }
          } else {
            await prisma.customerProfile.create({ data: { customerName: displayName, company, orderType, orderCount } })
            results.customerProfiles = (results.customerProfiles || 0) + 1
          }
        } catch (e) { results.errors.push(`CustomerProfile: ${e.message}`) }
      }
    }

    // Summary only, not a per-row dump — this single call can rewrite most
    // of the master-data estate at once (suppliers, microbes, products,
    // equipment, RM, recipe/BOM, gate/print/inward/outward), so `results`
    // (already the per-table counts this response returns) is exactly the
    // right level of detail for the audit trail.
    await writeAudit({ ...auditUser(req), action: 'IMPORT', module: 'admin', tableName: 'bulk_import', newValue: results })
    return res.json({
      success: true,
      data: results,
      message: `Import complete — Suppliers: ${results.supplierMaster}, Microbes: ${results.microbeMaster}, Products: ${results.productMaster}, Equipment: ${results.equipmentMaster}, RM: ${results.rmMaster}, Recipe/BOM: ${results.recipeBom}, Customer Profiles: ${results.customerProfiles || 0}, Packs: ${results.printMaster}, Inward: ${results.inward}, Outward: ${results.outward}`
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success: false, error: e.message, code: 'INTERNAL_ERROR' })
  }
}
