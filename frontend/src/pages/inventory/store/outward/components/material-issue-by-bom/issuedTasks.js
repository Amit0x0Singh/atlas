// Tracks which planning tasks have already been picked to start BOM issuance,
// so they drop out of the "select a task" list immediately (independent of the
// bom_issue_sessions lifecycle, which clears once a session is fully issued).
const KEY = 'bom_issued_task_keys'

export const taskKey = (productCode, batchRef) => `${productCode || ''}__${batchRef || ''}`

export const readIssuedKeys = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
}

export const markIssued = (key) => {
  const set = readIssuedKeys()
  set.add(key)
  localStorage.setItem(KEY, JSON.stringify([...set]))
}
