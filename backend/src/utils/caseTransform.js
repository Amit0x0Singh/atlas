// The microbial-sfg module's wire contract is snake_case (its create/update
// controllers already accept snake_case bodies, and a couple of its read
// endpoints already hand-roll snake_case responses) — this mechanically
// converts a Prisma row's camelCase keys to match, instead of hand-mapping
// each field (error-prone once a model has a dozen+ columns) or fighting
// the module's existing convention from the frontend side.
function camelToSnake(key) {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

export function toSnakeRow(row) {
  if (row === null || typeof row !== 'object' || row instanceof Date) return row
  if (Array.isArray(row)) return row.map(toSnakeRow)
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    out[camelToSnake(k)] = toSnakeRow(v)
  }
  return out
}
