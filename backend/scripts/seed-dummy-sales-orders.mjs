// Dev-only: seed a handful of dummy Sales Orders so the Order History table
// has something to render. Safe to re-run — it deletes its own rows first
// (matched by the DUMMY- diNo prefix). NOT wired into any npm script.
//
//   node scripts/seed-dummy-sales-orders.mjs          # create
//   node scripts/seed-dummy-sales-orders.mjs --clean  # just remove them

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const CLEAN_ONLY = process.argv.includes('--clean')
const PREFIX = 'DUMMY-'

const COMPANIES = ['som', 'dvs', 'al-ipl', 'al-pte']
const TYPES = ['DOMESTIC', 'EXPORT', 'ECOM', 'SAMPLE']
const STATUSES = ['PENDING', 'PLANNED', 'UNDER_PRODUCTION', 'IN_INVENTORY', 'DISPATCHED']
const CUSTOMERS = [
  'Green Harvest Agro', 'BioCrop Solutions', 'Sunrise Fertilizers',
  'AgriLife Distributors', 'Nirmal Seeds', 'Krishi Kendra', 'FarmFirst Inc', 'AgroStar Retail',
]
const PRODUCTS = [
  ['Trichoderma Viride 1%', 'TRICHO-VIRIDE-WP'],
  ['Pseudomonas Fluorescens', 'PSEUDO-FLUOR-WP'],
  ['Bacillus Subtilis 2%', 'BACILLUS-SUB-WP'],
  ['NPK Consortia Liquid', 'NPK-CONSORTIA-L'],
  ['Mycorrhiza Granules', 'MYCO-GRAN'],
  ['Metarhizium Anisopliae', 'META-ANIS-WP'],
]
const PRIMARY = ['500ml HDPE Round Bottle', '1kg HDPE Jar with Cap', '100g LD Pouch', '1L Triangle Bottle']
const SECONDARY = ['Carton of 12', 'Carton of 20', '25kg HDPE Bag', '50L Barrel']

const pick = (a, i) => a[i % a.length]
const rand = (a) => a[Math.floor(Math.random() * a.length)]
const daysFromNow = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x }

async function clean() {
  const orders = await prisma.salesOrder.findMany({ where: { diNo: { startsWith: PREFIX } }, select: { id: true } })
  if (!orders.length) { console.log('No dummy orders to remove.'); return 0 }
  const ids = orders.map(o => o.id)
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: { in: ids } } })
  const del = await prisma.salesOrder.deleteMany({ where: { id: { in: ids } } })
  console.log(`Removed ${del.count} dummy orders.`)
  return del.count
}

async function seed() {
  const year = new Date().getFullYear()
  // Keep SoSequence ahead of whatever we mint here.
  const baseSeq = 9000
  let n = 0

  for (let i = 0; i < 9; i++) {
    const received = daysFromNow(-(i * 4 + 2))
    const etd = daysFromNow(i % 3 === 0 ? -3 : i * 3 - 4) // some overdue, some upcoming
    const nItems = 1 + (i % 3)
    const items = Array.from({ length: nItems }, (_, j) => {
      const [pname, pcode] = pick(PRODUCTS, i + j)
      const status = i === 0 ? 'IN_INVENTORY' : rand(STATUSES)
      return {
        lineNo: j + 1,
        customerProductName: pname,
        inhouseProductName: pname,
        inhouseProductCode: pcode,
        carrier: rand(['Talc', 'Dextrose', 'China Clay', null]),
        totalQty: (j + 1) * 25 + i * 10,
        totalUom: rand(['KG', 'LTR']),
        unitQty: 1,
        unitUom: 'KG',
        unitPackType: rand(PRIMARY),
        packingType: rand(SECONDARY),
        totalCS: 8,
        status,
      }
    })

    await prisma.salesOrder.create({
      data: {
        soId: `SO-${year}-D${String(baseSeq + i).padStart(4, '0')}`,
        company: pick(COMPANIES, i),
        diNo: `${PREFIX}${pick(COMPANIES, i).toUpperCase()}/SO-${String(101 + i)}`,
        customerName: pick(CUSTOMERS, i).toUpperCase(),
        orderType: pick(TYPES, i),
        orderReceivedDate: received,
        priority: rand(['MODERATE', 'URGENT', 'VERY_URGENT']),
        estimatedDispatchDate: etd,
        invoiceNo: i % 2 === 0 ? `INV-${2600 + i}` : null,
        invoiceDate: i % 2 === 0 ? received : null,
        salesStaff: rand(['R. Kulkarni', 'S. Menon', 'A. Deshpande', null]),
        remarks: i % 3 === 0 ? 'Handle with care — temperature sensitive.' : null,
        createdBy: 'seed-script',
        updatedBy: 'seed-script',
        items: { create: items },
      },
    })
    n++
  }

  // Nudge the real sequence so a genuine new order won't collide.
  await prisma.soSequence.upsert({
    where: { year },
    create: { year, seq: baseSeq + 20 },
    update: { seq: { increment: 0 } },
  })

  console.log(`Created ${n} dummy sales orders.`)
}

try {
  await clean()
  if (!CLEAN_ONLY) await seed()
} catch (e) {
  console.error(e)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
