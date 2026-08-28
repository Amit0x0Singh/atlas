export function groupPacks(packs) {
  const map = new Map()
  for (const p of packs) {
    const key = `${p.itemCode}||${p.lotNo}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        itemCode:     p.itemCode,
        itemName:     p.itemName,
        lotNo:        p.lotNo,
        invoiceNo:    p.invoiceNo,
        supplier:     p.supplier,
        receivedDate: p.receivedDate,
        uom:          p.uom,
        bags:         [],
      })
    }
    map.get(key).bags.push(p)
  }
  for (const g of map.values()) {
    g.bags.sort((a, b) => (a.bagNo || 0) - (b.bagNo || 0))
  }
  // Sort groups by receivedDate descending (most recent first)
  return Array.from(map.values()).sort((a, b) => {
    if (!a.receivedDate && !b.receivedDate) return 0
    if (!a.receivedDate) return 1
    if (!b.receivedDate) return -1
    return new Date(b.receivedDate) - new Date(a.receivedDate)
  })
}

// Distinct set of people who created/updated the underlying bag (PackDetail)
// rows in a group — bags in the same lot can carry different actors if
// they were scanned/edited individually, unlike the single lot-level
// PrintMaster creator. `field` is 'bagCreatedBy' or 'bagUpdatedBy'.
export function distinctActors(bags, field) {
  return [...new Set(bags.map((b) => b[field]).filter(Boolean))]
}

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
