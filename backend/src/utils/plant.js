// ProductMaster.plant is a string array (a product's recipe can span more
// than one plant). Callers may send an array already, or a single
// comma-separated string (e.g. from a simple text input) — normalize either
// into a clean array of non-empty, deduped plant names.
export function normalizePlant(plant) {
  const list = Array.isArray(plant) ? plant : String(plant || '').split(',')
  return [...new Set(list.map(p => String(p).trim()).filter(Boolean))]
}
