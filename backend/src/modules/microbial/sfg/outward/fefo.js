// FEFO (First-Expiry-First-Out) batch allocation — mirrors microbe.HTM's
// calcRow(): sort eligible ACTIVE batches by type priority (FSP, then BM,
// then everything else) and expiry ascending (no expiry sorts last), then
// greedily draw from each batch until the required CFU is covered.
function typePriority(typeCode) {
  if (typeCode === 'FSP') return 0
  if (typeCode === 'BM') return 1
  return 2
}

function expiryOf(inward) {
  if (!inward.shelfLifeDays) return null
  const d = new Date(inward.dateOfHarvest)
  d.setDate(d.getDate() + inward.shelfLifeDays)
  return d
}

// batches: array of MicrobialSfgInward rows (status ACTIVE, remainingQtyKg > 0),
// each carrying container.typeCode via `typeCode` field attached by the caller.
//
// inhouseCfuPerG is a rate per GRAM, but stock/requirements are tracked in
// KG — every CFU total here must go through the kg->g factor (x1000) before
// multiplying by a per-gram rate, or the reported CFU figures come out
// 1000x too small (the KG amounts allocated below happened to still net out
// correctly before this fix, since the same missing factor cancelled out in
// both the multiply and the divide — but the "Total CFU required" shown to
// the user was wrong).
const G_PER_KG = 1000

export function allocateFefo(batches, requiredQtyKg, requiredCfuPerG) {
  const totalCfuNeeded = requiredQtyKg * G_PER_KG * requiredCfuPerG

  const eligible = batches
    .filter((b) => Number(b.remainingQtyKg) > 0.0001 && Number(b.inhouseCfuPerG) > 0)
    .map((b) => ({ ...b, _expiry: expiryOf(b) }))
    .filter((b) => b._expiry === null || b._expiry.getTime() >= Date.now())
    .sort((a, b) => {
      const pa = typePriority(a.typeCode)
      const pb = typePriority(b.typeCode)
      if (pa !== pb) return pa - pb
      if (a._expiry === null && b._expiry === null) return 0
      if (a._expiry === null) return 1
      if (b._expiry === null) return -1
      return a._expiry - b._expiry
    })

  let remainingCfu = totalCfuNeeded
  const allocations = []
  for (const b of eligible) {
    if (remainingCfu <= 0.0001) break
    const qtyNeededKg = remainingCfu / (Number(b.inhouseCfuPerG) * G_PER_KG)
    const qtyTake = Math.min(qtyNeededKg, Number(b.remainingQtyKg))
    const cfuFrom = qtyTake * G_PER_KG * Number(b.inhouseCfuPerG)
    remainingCfu -= cfuFrom
    allocations.push({
      inwardId: b.inwardId,
      containerId: b.containerId,
      containerCode: b.containerCode,
      microbeType: b.microbeType,
      typeCode: b.typeCode,
      location: b.location,
      biomassBatchCode: b.biomassBatchCode,
      dateOfHarvest: b.dateOfHarvest,
      expiryDate: b._expiry,
      moisture: b.moisture,
      cfuPerG: Number(b.inhouseCfuPerG),
      availableKg: Number(b.remainingQtyKg),
      qtyToIssueKg: Number(qtyTake.toFixed(6)),
      cfuFromBatch: cfuFrom,
    })
  }

  return {
    totalCfuNeeded,
    remainingCfu: Math.max(0, remainingCfu),
    fulfilled: remainingCfu <= 0.0001,
    allocations,
  }
}
