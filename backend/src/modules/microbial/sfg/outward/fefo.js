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
export function allocateFefo(batches, requiredQtyKg, requiredCfuPerG) {
  const totalCfuNeeded = requiredQtyKg * requiredCfuPerG

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
    const qtyNeeded = remainingCfu / Number(b.inhouseCfuPerG)
    const qtyTake = Math.min(qtyNeeded, Number(b.remainingQtyKg))
    const cfuFrom = qtyTake * Number(b.inhouseCfuPerG)
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
