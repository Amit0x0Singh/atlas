export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const STATUS_COLORS = {
  AWAITING_INWARD:  "bg-yellow-100 text-yellow-800",
  INWARDED:         "bg-blue-100 text-blue-800",
  PARTIALLY_ISSUED: "bg-orange-100 text-orange-800",
  EXHAUSTED:        "bg-gray-100 text-gray-500",
  MIXED:            "bg-purple-100 text-purple-700",
};
export const statusColor = (s) => STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600";

export function groupStatus(bags) {
  const counts = {};
  for (const b of bags) counts[b.status] = (counts[b.status] || 0) + 1;
  const keys = Object.keys(counts);
  if (keys.length === 1) return keys[0];
  // Priority ladder: AWAITING > PARTIALLY > INWARDED > EXHAUSTED
  if (counts.AWAITING_INWARD)  return 'AWAITING_INWARD';
  if (counts.PARTIALLY_ISSUED) return 'PARTIALLY_ISSUED';
  if (counts.INWARDED)         return 'INWARDED';
  return 'MIXED';
}

// ─── Group packs by itemCode + lotNo (matches batch-label endpoint) ───────────
export function groupPacks(packs) {
  const map = new Map();
  for (const p of packs) {
    const key = `${p.itemCode}||${p.lotNo}`;
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
      });
    }
    map.get(key).bags.push(p);
  }
  // Sort bags within each group by bag number
  for (const g of map.values()) {
    g.bags.sort((a, b) => (a.bagNo || 0) - (b.bagNo || 0));
  }
  return Array.from(map.values());
}
