// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY credential store — flat-file accounts, no database, no schema.
//
// This replaces the old Prisma `User`-table login system for now. Each account
// belongs to one "operation" and has a role of 'admin' (full access — create,
// read, update, delete, approve) or 'employee' (read-only). Production accounts
// additionally carry a `plant` tag (Microbial / Nano / Botanical / Liquid /
// Powder / Granules) for future per-plant filtering — route-level access today
// is gated by `operation` only, not by individual plant.
//
// Swap this file (and middleware/auth.js's use of it) for a real user/role
// table + hashed passwords when a proper auth system replaces this one.
// ─────────────────────────────────────────────────────────────────────────────

export const OPERATIONS = ['gate', 'store', 'production', 'admin']
export const PRODUCTION_PLANTS = ['Microbial', 'Nano', 'Botanical', 'Liquid', 'Powder', 'Granules']

function account(email, password, operation, role, plant = null) {
  return { email, password, operation, role, plant, fullName: email.split('@')[0] }
}

export const accounts = [
  // ── Gate ──
  account('gate@agrilife.com', 'gate@745', 'gate', 'admin'),
  account('gateemployee@agrilife.com', 'gate@7405emp', 'gate', 'employee'),

  // ── Store ──
  account('store@agrilife.com', 'store@789', 'store', 'admin'),
  account('storeemployee@agrilife.com', 'store@7890emp', 'store', 'employee'),

  // ── Admin (super-admin — full access to every operation) ──
  account('admin@agrilife.com', 'admin@2005', 'admin', 'admin'),
  account('adminemployee@agrilife.com', 'admin@2005emp', 'admin', 'employee'),

  // ── Production — six plants, each its own operation-scoped account pair ──
  account('microbial@agrilife.com', 'microbial@123', 'production', 'admin', 'Microbial'),
  account('microbialemployee@agrilife.com', 'microbial@emp123', 'production', 'employee', 'Microbial'),
  account('nano@agrilife.com', 'nano@123', 'production', 'admin', 'Nano'),
  account('nanoemployee@agrilife.com', 'nano@emp123', 'production', 'employee', 'Nano'),
  account('botanical@agrilife.com', 'botanical@123', 'production', 'admin', 'Botanical'),
  account('botanicalemployee@agrilife.com', 'botanical@emp123', 'production', 'employee', 'Botanical'),
  account('liquid@agrilife.com', 'liquid@123', 'production', 'admin', 'Liquid'),
  account('liquidemployee@agrilife.com', 'liquid@emp123', 'production', 'employee', 'Liquid'),
  account('powder@agrilife.com', 'powder@123', 'production', 'admin', 'Powder'),
  account('powderemployee@agrilife.com', 'powder@emp123', 'production', 'employee', 'Powder'),
  account('granules@agrilife.com', 'granules@123', 'production', 'admin', 'Granules'),
  account('granulesemployee@agrilife.com', 'granules@emp123', 'production', 'employee', 'Granules'),
]

export function findAccount(email) {
  const needle = String(email || '').trim().toLowerCase()
  return accounts.find(a => a.email.toLowerCase() === needle)
}
