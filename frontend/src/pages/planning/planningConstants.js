// ── Shared constants & helpers for the Planning ERP module ────────────────────

export const PLANT_CONFIG = {
  Nano: {
    prefix: 'NP',
    color: '#1a4a6b',
    colorLight: '#eff6ff',
    label: 'Nano Technology Plant',
    incharge: ['Narendra'],
    equipment: ['GLR01','GLR02 (Silver)','GLR03','GLR04','SSR01','SSR02','Erlenmeyer flask 1L','Erlenmeyer flask 5L','Cut Drum','Bucket','Sparkler filter'],
    process: ['Formulation','Steam Cleaning','Observation','Filtration','Packing','Reformulation','Unloading'],
    statuses: ['Not Started','Under Process','QC Pending','Completed','On Hold','Under Observation'],
    fields: ['equipment'],
    equipLabel: 'Reactor / Vessel',
    qtyLabel: 'Total Qty (L)',
  },
  Botanical: {
    prefix: 'BP',
    color: '#2d5e18',
    colorLight: '#f0fdf4',
    label: 'Botanical Plant',
    incharge: ['Vinay','Logeshwaran','Rathnakar','Vinay+Rathnakar'],
    equipment: ['E1','E2','FFE','DV 03','DV 04','DV 05','MV 03','MV 06','FTR B1','FTR B2','GLR 01','GLR 02','P1','P2','P3','P4','P5','P6','PULVERIZER'],
    process: ['RM Charging','Extraction','Stripping','Solvent recovery','Unloading','Percolation','Incubation','Conc (VD)','TD','Spent Drying (In Percolator)','Spent Drying in P3','Concentration','RTS','Pre centrifugation','Post centrifugation','Filtration','Formulation','Packing','Circulation'],
    statuses: ['Not Started','Under Process','QC Results Awaiting','On Hold','Unloading','Cooling','Heating','Completed'],
    fields: ['equipment','specs','timer'],
    equipLabel: 'Equipment',
    qtyLabel: 'Total Qty (L/kg)',
  },
  Liquid: {
    prefix: 'LFF',
    color: '#7c3aed',
    colorLight: '#f5f3ff',
    label: 'Liquid Filling & Formulations',
    incharge: ['Ningappa','Anand'],
    equipment: ['Manual','Machine - Oil','Machine - Aqua'],
    process: ['Filling','Labeling','Packing','Formulation','Re-packing','Decantation'],
    statuses: ['Not Started','Under Process','Completed','On Hold','QC Pending'],
    fields: ['equipment','carrier','packing'],
    equipLabel: 'Equipment Allotted',
    qtyLabel: 'Total Qty (L)',
    carrier: ['EW','EC','EO','Aqua'],
    primaryPack: ['Triangle-B','Round-B','Amway-B','Rect-B','5L HDPE C','25L HDPE C','CUST Cans','Spray-B','200L Bar','AL-B','20L Cans','Amber-B','BL-Pouch'],
    inners: ['Inners','Air Vent Inners','WAD','Air Vent WAD'],
    secondaryPack: ['W-CBB','B-CBB','5L HDPE C','25L HDPE C','25KG LD+HDPE B','50KG LD+HDPE B','LD+OMB30','LD+OMB50','WSP+OMB50','3KG CUST BAGS','8KG CUST BAGS','PB','CUST CANS','20L JERRY CAN','AL-B','Thermo-B'],
    labels: ['Packing Slips','Customer Labels','Computer Labels','Retail Labels'],
  },
  Powder: {
    prefix: 'PF',
    color: '#92400e',
    colorLight: '#fffbeb',
    label: 'Powder Formulations',
    incharge: ['Anand','Abhinandan'],
    equipment: ['500kg RB','100kg DCB','1MT RB','50kg RB','Sifter','Manual','VTD','1MT DCB','1MT OB','TD','CSM','Stretch Film','70kg RMG','1MT MSB','Pulverizer'],
    process: ['Technical','Formulation','Sieving','Filling','Packing','CS','Unloading','Labelling','Decantation','Vacuum Packing'],
    statuses: ['Not Started','Under Process','Completed','On Hold','QC Pending'],
    fields: ['location','carrier','specs','packing'],
    sfgEligible: true,
    equipLabel: 'Equipment Allotted',
    qtyLabel: 'Total Qty (kg)',
    location: ['MPD','DVS Room','AL Packing Area','AL Tech Room','AL Form Room-1','AL Form Room-2','Powder Room','Stores','SSF','FFS Packing Area'],
    carrier: ['G-Dex','Dex','G-Lac','Lac','Talc','G-Talc','LSP','K Humate','HSCAS','RM','Silica','China Clay','Lignite','Zeolite','Vermiculite','ppt CaCO3','Kaolin','SDP','Diatom','Maltodextrin','Dextrin'],
    primaryPack: ['LD','BL','AL','PB','WSP','Customer Pouches','LD+BL','LD+AL','LD+CL','LD+US','LD+PB','WSP+JARS','WSP+BL','WSP+AL','LD+CUST'],
    secondaryPack: ['OMB30','OMB50','25HDPE-B','50HDPE-B','B-CBB','W-CBB','THERMO+BCBB','THERMO+WCBB','CUST Buckets','CUST Bags','PB'],
    labels: ['Packing Slips','Customer Labels','Computer Labels','Retail Labels'],
  },
  Granules: {
    prefix: 'GR',
    color: '#0f766e',
    colorLight: '#f0fdfa',
    label: 'Granules',
    incharge: ['Babu'],
    equipment: ['Manual','FFS Filling Machine','Granulator','Pulverizer','1MT SS RB','1MT MS RB','GR Filling Machine','1MT DCB','1MT OB','Sifter'],
    process: ['Filling','Labeling','Packing','Formulation','Re-packing','Sieving'],
    statuses: ['Not Started','Under Process','Completed','On Hold','QC Pending'],
    fields: ['location','carrier','specs','packing'],
    sfgEligible: true,
    equipLabel: 'Equipment Allotted',
    qtyLabel: 'Total Qty (kg)',
    location: ['Granules Plant','Stores','FFS Packing Area','GR Room'],
    carrier: ['G-Dex','NG-Dex','G-Lac','NG-Lac','Talc','LSP','K Humate','HSCAS','RM','Silica','China Clay','Lignite','Zeolite','Vermiculite','ppt CaCO3','Kaolin','SDP','Diatom'],
    primaryPack: ['LD','BL','AL','PB','WSP','Customer Pouches','LD+BL','LD+AL','LD+CL','LD+US','LD+PB','WSP+JARS','WSP+BL','WSP+AL','LD+CUST'],
    secondaryPack: ['OMB30','OMB50','25HDPE-B','50HDPE-B','B-CBB','W-CBB','THERMO+BCBB','THERMO+WCBB','CUST Buckets','CUST Bags','PB'],
    labels: ['Packing Slips','Customer Labels','Computer Labels','Retail Labels'],
  },
}

export const SHIFTS = ['General','A','B','G','A+G','A+B']
export const PLANT_KEYS = ['Nano','Botanical','Liquid','Powder','Granules']
export const TAB_TO_PLANT = { nano:'Nano', botanical:'Botanical', liquid:'Liquid', powder:'Powder', granules:'Granules' }

// ── localStorage helpers ───────────────────────────────────────────────────────
export const SK = { tasks:'erp_tasks', batchReg:'erp_batch_registry', sfg:'erp_sfg_stock' }
export function lsLoad(k)   { try { return JSON.parse(localStorage.getItem(k)) || [] } catch { return [] } }
export function lsSave(k,d) { localStorage.setItem(k, JSON.stringify(d)) }

// ── Misc helpers ───────────────────────────────────────────────────────────────
export function genId()     { return Date.now().toString(36) + Math.random().toString(36).slice(2,5) }
export function todayISO()  { return new Date().toISOString().slice(0,10) }
export function addDays(d,n){ const dt = new Date(d+'T00:00:00'); dt.setDate(dt.getDate()+n); return dt.toISOString().slice(0,10) }
export function fmtDateLabel(iso){
  if (!iso) return '—'
  return new Date(iso+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})
}

// ── Status badge styling ───────────────────────────────────────────────────────
export const STATUS_STYLE = {
  'Completed':             'bg-green-100 text-green-700 border border-green-200',
  'Under Process':         'bg-blue-100 text-blue-700 border border-blue-200',
  'Not Started':           'bg-gray-100 text-gray-600 border border-gray-200',
  'On Hold':               'bg-amber-100 text-amber-700 border border-amber-200',
  'QC Pending':            'bg-purple-100 text-purple-700 border border-purple-200',
  'QC Results Awaiting':   'bg-purple-100 text-purple-700 border border-purple-200',
  'Under Observation':     'bg-purple-100 text-purple-700 border border-purple-200',
  'Unloading':             'bg-teal-100 text-teal-700 border border-teal-200',
  'Cooling':               'bg-cyan-100 text-cyan-700 border border-cyan-200',
  'Heating':               'bg-red-100 text-red-700 border border-red-200',
}
export function statusBadgeCls(s) { return STATUS_STYLE[s] || 'bg-gray-100 text-gray-500 border border-gray-200' }

export const PLANT_BADGE = {
  Nano:      'bg-blue-100 text-blue-800 border border-blue-200',
  Botanical: 'bg-green-100 text-green-800 border border-green-200',
  Liquid:    'bg-purple-100 text-purple-800 border border-purple-200',
  Powder:    'bg-amber-100 text-amber-800 border border-amber-200',
  Granules:  'bg-teal-100 text-teal-800 border border-teal-200',
}

// ── SFG helpers ────────────────────────────────────────────────────────────────
export function sfgLoad()   { try { return JSON.parse(localStorage.getItem('erp_sfg_stock')) || [] } catch { return [] } }
export function sfgSave(l)  { localStorage.setItem('erp_sfg_stock', JSON.stringify(l)) }
export function sfgAddEntry({ productName, batchCode, plant, qty, qtyUom, location, sourceTaskId }) {
  const list = sfgLoad()
  list.push({
    id: genId(),
    productName, batchCode, plant,
    qty: parseFloat(qty) || 0,
    qtyRemaining: parseFloat(qty) || 0,
    qtyUom: qtyUom || 'kg',
    location: location || '',
    sourceTaskId: sourceTaskId || '',
    status: 'Available',
    createdAt: new Date().toISOString(),
  })
  sfgSave(list)
}

// ── Batch code engine ──────────────────────────────────────────────────────────
function genProductCode(productName, existingCodes) {
  const skip = new Set(['of','and','the','in','with','for','a','an','by'])
  const words = productName.trim().split(/\s+/).filter(w => !skip.has(w.toLowerCase()))
  let code = words.slice(0,3).map(w => w[0].toUpperCase()).join('')
  if (code.length < 2) code = productName.slice(0,3).toUpperCase()
  let attempt = code, n = 2
  while (existingCodes.has(attempt) && n < 100) { attempt = code + n; n++ }
  return attempt
}

export function getNextBatchCode(plant, productName, carrier, specs, today) {
  const registry = lsLoad(SK.batchReg)
  const tasks    = lsLoad(SK.tasks)
  const needsCarrierSpecs = ['Powder','Granules'].includes(plant)
  const yymmdd = today.slice(2).replace(/-/g,'')

  const existingCodes = new Set(registry.map(r => r.productCode))
  let prodEntry = registry.find(r => r.productName.toLowerCase() === productName.toLowerCase())
  if (!prodEntry) {
    const newCode = genProductCode(productName, existingCodes)
    prodEntry = { productName, productCode: newCode }
    registry.push(prodEntry)
    lsSave(SK.batchReg, registry)
  }
  const pCode = prodEntry.productCode

  if (!needsCarrierSpecs) {
    const prevActive = tasks.filter(t => t.plant === plant && t.productName === productName && t.status !== 'Completed' && t.status !== 'Cancelled')
    if (prevActive.length > 0) return { code: prevActive[prevActive.length-1].batchCode, carried: true }
    const allPrev = tasks.filter(t => t.plant === plant && t.productName === productName)
    const seq = String(allPrev.length + 1).padStart(2,'0')
    return { code: pCode + yymmdd + seq, carried: false }
  } else {
    const cCode = (carrier||'X').replace(/[^A-Za-z0-9]/g,'').slice(0,4).toUpperCase()
    let sCode = 'S'
    if (specs) { const m = specs.toUpperCase().match(/E[+]?(\d+)/); if (m) sCode = m[0].replace('+','').slice(0,3) }
    const key = productName + '|' + carrier + '|' + specs
    const prevActive = tasks.filter(t => t.plant === plant && t.batchKey === key && t.status !== 'Completed' && t.status !== 'Cancelled')
    if (prevActive.length > 0) return { code: prevActive[prevActive.length-1].batchCode, carried: true }
    const allPrev = tasks.filter(t => t.plant === plant && t.batchKey === key)
    const seq = String(allPrev.length + 1).padStart(2,'0')
    return { code: `${pCode}-${cCode}-${sCode}-${yymmdd}-${seq}`, carried: false }
  }
}

export function generateTaskId(plant, date) {
  const prefix = PLANT_CONFIG[plant]?.prefix || 'XX'
  const d = date.replace(/-/g,'')
  const tasks = lsLoad(SK.tasks).filter(t => t.plant === plant && t.date === date)
  const seq = String(tasks.length + 1).padStart(2,'0')
  return `${prefix}-${d}-${seq}`
}
