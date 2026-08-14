// ─── Centralized query key factory ─────────────────────────────────────────
// One source of truth for every query key in the app, so a hook and the
// mutation that invalidates it can never drift apart by a typo. Keys are
// arrays (TanStack convention) — the first segment is the "domain" used for
// broad invalidation (e.g. queryClient.invalidateQueries({ queryKey:
// queryKeys.employees.all() }) invalidates the list AND every ['employee', id]
// detail query, since TanStack matches by key prefix).
//
// Pattern per domain: `all` (list, optionally filtered) and `detail` (single
// record by id). Add a new domain here before adding hooks for it — keeps
// this file the map of "every kind of data the app fetches."

export const queryKeys = {
  // ── HR ──────────────────────────────────────────────────────────────────
  employees: {
    all:    (filters) => filters ? ['employees', filters] : ['employees'],
    detail: (id)       => ['employee', id],
    pages:        () => ['employees', 'pages'],
    roleDefaults: () => ['employees', 'role-defaults'],
    permissions:  (role) => ['employees', 'permissions', role],
    companies:    () => ['employees', 'companies'],
  },

  // ── Masters ─────────────────────────────────────────────────────────────
  products: {
    all:    (filters) => filters ? ['products', filters] : ['products'],
    detail: (code)     => ['product', code],
    meta:   () => ['products', 'meta'],
  },
  equipment: {
    all:  (filters) => filters ? ['equipment', filters] : ['equipment'],
    meta: () => ['equipment', 'meta'],
  },
  recipes: {
    all:    (productCode) => ['recipes', productCode ?? null],
    products: () => ['recipes', 'products'],
  },
  rmMaster: {
    all:    (filters) => filters ? ['rm-master', filters] : ['rm-master'],
    detail: (code)     => ['rm-master', code],
  },
  microbes: {
    all: () => ['microbes'],
  },
  microbialContainers: {
    all: (filters) => filters ? ['microbial-containers', filters] : ['microbial-containers'],
  },
  microbialSfgInward: {
    all:     (filters) => filters ? ['microbial-sfg-inward', filters] : ['microbial-sfg-inward'],
    summary: () => ['microbial-sfg-inward', 'summary'],
  },
  microbialSfgOutward: {
    all:    (filters) => filters ? ['microbial-sfg-outward', filters] : ['microbial-sfg-outward'],
    detail: (id) => ['microbial-sfg-outward', id],
  },
  microbialSfgHistory: {
    all: (filters) => filters ? ['microbial-sfg-history', filters] : ['microbial-sfg-history'],
  },
  microbialSfgDashboard: {
    all: () => ['microbial-sfg-dashboard'],
  },
  microbialSfgStorage: {
    grid:            () => ['microbial-sfg-storage', 'grid'],
    availableSlots:  (filters) => ['microbial-sfg-storage', 'available-slots', filters ?? null],
  },
  microbialSfgStockSummary: {
    microbeWise:     () => ['microbial-sfg-stock-summary', 'microbe-wise'],
    containerLedger: () => ['microbial-sfg-stock-summary', 'container-ledger'],
  },
  suppliers: {
    all: (filters) => filters ? ['suppliers', filters] : ['suppliers'],
  },

  // ── Inventory ───────────────────────────────────────────────────────────
  inventory: {
    all: (filters) => filters ? ['inventory', filters] : ['inventory'],
  },
  stock: {
    dashboard:  (period) => ['dashboard-summary', period ?? 'today'],
    item:       (itemCode) => ['stock', itemCode],
    containers: () => ['stock', 'containers'],
  },
  packs: {
    pendingInward: () => ['packs', 'pending-inward'],
  },
  inward: {
    sessions:       (filters) => filters ? ['inward-sessions', filters] : ['inward-sessions'],
    activeSessions: () => ['inward-sessions', 'active'],
    session:        (sessionId) => ['inward-session', sessionId],
  },
  outward: {
    history:      (filters) => filters ? ['outward-history', filters] : ['outward-history'],
    bomSessions:  () => ['outward', 'bom-sessions'],
  },
  containers: {
    all:    (filters) => filters ? ['containers', filters] : ['containers'],
    detail: (id)       => ['container', id],
  },
  ledger: {
    all:  (filters) => filters ? ['ledger', filters] : ['ledger'],
    item: (itemCode, filters) => ['ledger', itemCode, filters ?? null],
    meta: () => ['ledger', 'meta'],
  },
  gate: {
    inward:  (filters) => ['gate-inward', filters ?? null],
    outward: (filters) => ['gate-outward', filters ?? null],
  },
  grn: {
    all: () => ['grn'],
  },

  // ── Sales ───────────────────────────────────────────────────────────────
  salesOrders: {
    all:    (filters) => filters ? ['sales-orders', filters] : ['sales-orders'],
    detail: (id)       => ['sales-order', id],
  },
  customerProfiles: {
    all:    (filters) => filters ? ['customer-profiles', filters] : ['customer-profiles'],
    detail: (id)       => ['customer-profile', id],
  },

  // ── Production ──────────────────────────────────────────────────────────
  production: {
    all: (filters) => filters ? ['production', filters] : ['production'],
  },
  indents: {
    all:    (filters) => filters ? ['indents', filters] : ['indents'],
    detail: (id)       => ['indent', id],
  },
  planTasks: {
    all: (filters) => filters ? ['plan-tasks', filters] : ['plan-tasks'],
  },

  // ── Planning ────────────────────────────────────────────────────────────
  planning: {
    all: (filters) => filters ? ['planning', filters] : ['planning'],
  },

  // ── Notifications ───────────────────────────────────────────────────────
  notifications: {
    all:    () => ['notifications'],
    unread: () => ['notifications', 'unread-count'],
  },

  // ── Auth ────────────────────────────────────────────────────────────────
  auth: {
    me: () => ['auth', 'me'],
  },

  // ── RBAC (role/user assignment) ────────────────────────────────────────
  rbac: {
    roles:       () => ['rbac', 'roles'],
    permissions: () => ['rbac', 'permissions'],
    users:       () => ['rbac', 'users'],
  },

  // ── Settings ────────────────────────────────────────────────────────────
  options: {
    values: (groupCode) => ['options', groupCode],
    groups: ()           => ['options', 'groups'],
    group:  (groupCode)  => ['options', 'groups', groupCode],
  },
}
