// productCode (PR00001-style) is computed from MAX(existing code)+1 at
// insert time, not a DB sequence — same pattern as microbeCode, see
// microbe-code.js. A raw CREATE SEQUENCE default is only ever owned/granted
// to whichever role ran the migration; on the hosted DB the app's role never
// got USAGE on it, so every insert failed with "permission denied for
// sequence product_master_pr_code_seq". Computing the code in application
// code sidesteps DB-level sequence grants entirely.
export async function getMaxProductCodeNum(prisma) {
  const rows = await prisma.productMaster.findMany({ select: { productCode: true } })
  let max = 0
  for (const r of rows) {
    const m = /^PR(\d+)$/i.exec(r.productCode || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}

export function formatProductCode(num) {
  return `PR${String(num).padStart(5, '0')}`
}
