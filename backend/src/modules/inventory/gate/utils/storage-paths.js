import path from 'path'
import fs from 'fs'

// Mirrors backend/src/modules/backup/utils/storage-paths.js — a sibling dir
// under the same git-ignored backend/storage/ root.
export const GATE_INWARD_INVOICES_DIR = path.join(process.cwd(), 'storage', 'gate-inward-invoices')

export function ensureGateStorageDirs() {
  fs.mkdirSync(GATE_INWARD_INVOICES_DIR, { recursive: true })
}
