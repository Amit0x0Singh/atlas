// auto-seed.js
// Seeds reference tables on first startup if they are empty.
// Safe to run repeatedly — checks count before doing anything.
import prisma from '../../config/db.js'

const COMPANIES = [
  { code: 'SOM',    name: 'SOM Phytopharma Pvt Ltd' },
  { code: 'AL-IPL', name: 'Agrilife India Pvt Ltd' },
  { code: 'AL-LLC', name: 'Agrilife LLC' },
  { code: 'AL-PTE', name: 'Agrilife PTE Ltd' },
  { code: 'DVS',    name: 'DVS Agri Pvt Ltd' },
]

// The groupCode a frontend <select> is wired to (e.g. useOptionValues('WAREHOUSE'))
// is a string baked into that component's source — nobody should have to
// guess/retype it by hand in the admin UI. This ensures every group a
// consumer actually depends on always exists (originally created once by
// migration 20260811100001, which isn't idempotent and doesn't rerun on a
// fresh DB or after data loss). Admins still fully own the VALUES within
// each group from here — adding, editing, deactivating, reordering — this
// only guarantees the group itself, and a starting set of values, exist.
const OPTION_GROUPS = [
  {
    groupCode: 'COMPANY', label: 'Company',
    description: 'Legal entities used on Gate and Sales Order forms',
    values: [
      { code: 'SOM',    label: 'SOM Phytopharma', sortOrder: 0 },
      { code: 'DVS',    label: 'DVS',             sortOrder: 1 },
      { code: 'AL-IPL', label: 'AL-IPL',          sortOrder: 2 },
      { code: 'AL-PTE', label: 'AL-PTE',          sortOrder: 3 },
      { code: 'AL-LLC', label: 'AL-LLC',          sortOrder: 4 },
    ],
  },
  {
    groupCode: 'CATEGORY', label: 'Category',
    description: 'Raw Material category',
    values: [
      { code: 'raw materials',        label: 'Raw Materials',        sortOrder: 0 },
      { code: 'raw material',         label: 'Raw Material',         sortOrder: 1 },
      { code: 'consumables consumed', label: 'Consumables Consumed', sortOrder: 2 },
      { code: 'packing material',     label: 'Packing Material',     sortOrder: 3 },
    ],
  },
  {
    groupCode: 'SUB_CATEGORY', label: 'Sub-Category',
    description: 'Raw Material sub-category',
    values: [
      { code: 'chemicals',               label: 'Chemicals',               sortOrder: 0 },
      { code: 'herbal extracts',         label: 'Herbal Extracts',         sortOrder: 1 },
      { code: 'others-rm',               label: 'Others - RM',             sortOrder: 2 },
      { code: 'oils',                    label: 'Oils',                    sortOrder: 3 },
      { code: 'production consumables',  label: 'Production Consumables',  sortOrder: 4 },
      { code: 'lab consumables',         label: 'Lab Consumables',         sortOrder: 5 },
      { code: 'solvents',                label: 'Solvents',                sortOrder: 6 },
      { code: 'carriers',                label: 'Carriers',                sortOrder: 7 },
      { code: 'technical',               label: 'Technical',               sortOrder: 8 },
      { code: 'packing material',        label: 'Packing Material',        sortOrder: 9 },
      { code: 'others-pm',               label: 'Others - PM',             sortOrder: 10 },
      { code: 'boxes & cartons',         label: 'Boxes & Cartons',         sortOrder: 11 },
      { code: 'labels',                  label: 'Labels',                  sortOrder: 12 },
      { code: 'pouches & covers & bags', label: 'Pouches & Covers & Bags', sortOrder: 13 },
      { code: 'bottles',                 label: 'Bottles',                 sortOrder: 14 },
      { code: 'drums',                   label: 'Drums',                   sortOrder: 15 },
    ],
  },
  {
    groupCode: 'WAREHOUSE', label: 'Warehouse',
    description: 'Pack Inward destination warehouse/location',
    values: [
      { code: 'BULK ROOM',             label: 'Bulk Room',             sortOrder: 0 },
      { code: 'BOX GODOWN',            label: 'Box Godown',            sortOrder: 1 },
      { code: 'BOTTLE GODOWN',         label: 'Bottle Godown',         sortOrder: 2 },
      { code: 'STERILE ROOM I',        label: 'Sterile Room I',        sortOrder: 3 },
      { code: 'STERILE ROOM II',       label: 'Sterile Room II',       sortOrder: 4 },
      { code: 'COLD ROOM',             label: 'Cold Room',             sortOrder: 5 },
      { code: 'SOLVENT GODOWN',        label: 'Solvent Godown',        sortOrder: 6 },
      { code: 'ACM ROOM',              label: 'ACM Room',              sortOrder: 7 },
      { code: 'HERBAL STORAGE',        label: 'Herbal Storage',        sortOrder: 8 },
      { code: 'BLACK POWDER GODOWN',   label: 'Black Powder Godown',   sortOrder: 9 },
      { code: 'SEED STORAGE GODOWN',   label: 'Seed Storage Godown',   sortOrder: 10 },
      { code: 'POWDER STORAGE GODOWN', label: 'Powder Storage Godown', sortOrder: 11 },
      { code: 'GRANULES GODOWN',       label: 'Granules Godown',       sortOrder: 12 },
      { code: 'GENERAL GODOWN',        label: 'General Godown',        sortOrder: 13 },
      { code: 'PRINTING SECTION',      label: 'Printing Section',      sortOrder: 14 },
    ],
  },
  {
    groupCode: 'CARRIER', label: 'Carrier',
    description: 'Sales Order carrier/excipient options',
    values: [
      { code: 'Dextrose',           label: 'Dextrose',           sortOrder: 0 },
      { code: 'Talc',               label: 'Talc',               sortOrder: 1 },
      { code: 'Lactose',            label: 'Lactose',            sortOrder: 2 },
      { code: 'HSCAS',              label: 'HSCAS',               sortOrder: 3 },
      { code: 'China Clay',         label: 'China Clay',         sortOrder: 4 },
      { code: 'Diatomaceous Earth', label: 'Diatomaceous Earth', sortOrder: 5 },
      { code: 'LSP',                label: 'LSP',                sortOrder: 6 },
      { code: 'Precipitated CaCO3', label: 'Precipitated CaCO3', sortOrder: 7 },
      { code: 'Silica',             label: 'Silica',             sortOrder: 8 },
    ],
  },
  {
    groupCode: 'PRIMARY_PACKING', label: 'Primary Packing',
    description: 'Sales Order primary packing options',
    values: [
      { code: 'LD Pouch',                label: 'LD Pouch',                  sortOrder: 0 },
      { code: 'AL Pouch',                label: 'AL Pouch',                  sortOrder: 1 },
      { code: 'HDPE Jar',                label: 'HDPE Jar',                  sortOrder: 2 },
      { code: '100ml Bottle (Round)',    label: '100ml Bottle (Round)',      sortOrder: 3 },
      { code: '100ml Bottle (Regular)',  label: '100ml Bottle (Regular)',    sortOrder: 4 },
      { code: '100ml Bottle (Triangle)', label: '100ml Bottle (Triangle)',   sortOrder: 5 },
      { code: '200ml Bottle (Round)',    label: '200ml Bottle (Round)',      sortOrder: 6 },
      { code: '200ml Bottle (Regular)',  label: '200ml Bottle (Regular)',    sortOrder: 7 },
      { code: '200ml Bottle (Triangle)', label: '200ml Bottle (Triangle)',   sortOrder: 8 },
      { code: '500ml Bottle (Round)',    label: '500ml Bottle (Round)',      sortOrder: 9 },
      { code: '500ml Bottle (Regular)',  label: '500ml Bottle (Regular)',    sortOrder: 10 },
      { code: '500ml Bottle (Triangle)', label: '500ml Bottle (Triangle)',   sortOrder: 11 },
      { code: '1L Bottle (Round)',       label: '1L Bottle (Round)',         sortOrder: 12 },
      { code: '1L Bottle (Regular)',     label: '1L Bottle (Regular)',       sortOrder: 13 },
      { code: '1L Bottle (Triangle)',    label: '1L Bottle (Triangle)',      sortOrder: 14 },
    ],
  },
  {
    groupCode: 'SECONDARY_PACKING', label: 'Secondary Packing',
    description: 'Sales Order secondary packing options',
    values: [
      { code: 'W-CBB',              label: 'W-CBB',              sortOrder: 0 },
      { code: 'B-CBB',              label: 'B-CBB',              sortOrder: 1 },
      { code: 'OMB 30 (30kg Drum)', label: 'OMB 30 (30kg Drum)', sortOrder: 2 },
      { code: 'OMB 50 (50kg Drum)', label: 'OMB 50 (50kg Drum)', sortOrder: 3 },
      { code: '25Kg HDPE Bag',      label: '25Kg HDPE Bag',      sortOrder: 4 },
      { code: '50Kg HDPE Bag',      label: '50Kg HDPE Bag',      sortOrder: 5 },
      { code: 'Cartons',            label: 'Cartons',            sortOrder: 6 },
      { code: '25L Jerry Can',      label: '25L Jerry Can',      sortOrder: 7 },
      { code: '50L Barrel',         label: '50L Barrel',         sortOrder: 8 },
      { code: '5L Can',             label: '5L Can',             sortOrder: 9 },
      { code: '10L Can',            label: '10L Can',            sortOrder: 10 },
      { code: 'Others',             label: 'Others',             sortOrder: 11 },
    ],
  },
  {
    groupCode: 'LABEL_TYPE', label: 'Label Type',
    description: 'Sales Order label type options',
    values: [
      { code: 'CUSTOMER',     label: 'Customer Label', sortOrder: 0 },
      { code: 'COMPUTER',     label: 'Computer Label', sortOrder: 1 },
      { code: 'RETAIL',       label: 'Retail Label',   sortOrder: 2 },
      { code: 'PACKING_SLIP', label: 'Packing Slip',   sortOrder: 3 },
    ],
  },
  {
    groupCode: 'SHIFT', label: 'Shift',
    description: 'Production Planning shift options',
    values: [
      { code: 'General', label: 'General', sortOrder: 0 },
      { code: 'A',       label: 'A',       sortOrder: 1 },
      { code: 'B',       label: 'B',       sortOrder: 2 },
      { code: 'G',       label: 'G',       sortOrder: 3 },
      { code: 'A+G',     label: 'A+G',     sortOrder: 4 },
      { code: 'A+B',     label: 'A+B',     sortOrder: 5 },
    ],
  },
]

export async function runAutoSeed(log) {
  try {
    // ── 1. Seed CompanyMaster ────────────────────────────────────────────────
    const coCount = await prisma.companyMaster.count()
    if (coCount === 0) {
      for (const c of COMPANIES) {
        await prisma.companyMaster.upsert({
          where: { code: c.code },
          update: {},
          create: { code: c.code, name: c.name },
        })
      }
      log(`Auto-seed: loaded ${COMPANIES.length} companies`)
    }

    // ── 2. Ensure Option Groups (+ a starting set of values) exist ──────────
    let groupsCreated = 0, valuesCreated = 0
    for (const g of OPTION_GROUPS) {
      const existed = await prisma.optionGroup.findUnique({ where: { groupCode: g.groupCode } })
      const group = await prisma.optionGroup.upsert({
        where: { groupCode: g.groupCode },
        update: {},
        create: { groupCode: g.groupCode, label: g.label, description: g.description },
      })
      if (!existed) groupsCreated++
      for (const v of g.values) {
        const existedValue = await prisma.optionValue.findUnique({
          where: { groupId_code: { groupId: group.id, code: v.code } },
        })
        await prisma.optionValue.upsert({
          where: { groupId_code: { groupId: group.id, code: v.code } },
          update: {},
          create: { groupId: group.id, code: v.code, label: v.label, sortOrder: v.sortOrder },
        })
        if (!existedValue) valuesCreated++
      }
    }
    if (groupsCreated || valuesCreated) {
      log(`Auto-seed: ensured option groups exist (${groupsCreated} group(s), ${valuesCreated} value(s) created)`)
    }

    // CustomerProfile and CustomerProductProfile are no longer auto-seeded
    // from bundled JSON — they're populated purely from live data (orders
    // create/update them; see cp-profiles.controller.js and
    // customer-profile.controller.js) and read straight from the database
    // wherever they're needed.

  } catch (err) {
    // Non-fatal — log but don't crash startup
    console.error('Auto-seed warning:', err.message)
  }
  // No $disconnect here — `prisma` is the shared client (see config/db.js),
  // still needed by every request for the rest of the process lifetime.
}
