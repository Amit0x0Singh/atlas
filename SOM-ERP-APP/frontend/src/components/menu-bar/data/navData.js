export const LEGACY_NAV = [
  {
    group: "DASHBOARD",
    items: [{ to: "/stock", label: "Stock Dashboard", icon: "▦" }],
  },
  {
    group: "MASTER DATA",
    items: [
      { to: "/rm-master", label: "Item Master", icon: "⬡" },
      { to: "/product-master", label: "Product Master", icon: "◈" },
      { to: "/equipment-master", label: "Plant Data", icon: "◎" },
      { to: "/employee-master", label: "Employee Data", icon: "👥" },
      { to: "/recipe", label: "Recipe / BOM", icon: "≡" },
      { to: "/microbes-master", label: "Microbes Master", icon: "🦠" },
    ],
  },
  {
    group: "INVENTORY / MATERIALS",
    items: [
      { to: "/print-master", label: "Print Master", icon: "▣" },
      { to: "/inward", label: "Inward", icon: "↓" },
      { to: "/outward", label: "Outward", icon: "↑" },
      { to: "/microbial-inward", label: "Microbial Inward", icon: "🧊" },
      { to: "/grn", label: "GRN", icon: "☰" },
      { to: "/ledger", label: "Stock Ledger", icon: "▤" },
      { to: "/location-master", label: "Location Master", icon: "📍" },
      { to: "/indent", label: "Indent Management", icon: "◻" },
    ],
  },
  {
    group: "SALES & PLANNING",
    items: [
      { to: "/sales-orders", label: "Sales Orders", icon: "📋" },
      { to: "/planning", label: "Production Planning", icon: "⚙️" },
    ],
  },
  {
    group: "PRODUCTION / MFG",
    items: [
      { to: "/tracker", label: "Batch Tracker", icon: "◈" },
      { to: "/production", label: "Production Master", icon: "🏭" },
      { to: "/sfg-store", label: "SFG", icon: "⚗️" },
    ],
  },
  {
    group: "QUALITY CONTROL",
    items: [
      { to: "/qc-samples", label: "QC Samples", icon: "🧫", soon: true },
      { to: "/qc-results", label: "Test Results", icon: "🔬", soon: true },
      { to: "/qc-reports", label: "Reports", icon: "📊", soon: true },
    ],
  },
  {
    group: "REPORTS / DATA",
    items: [{ to: "/import", label: "Data Import", icon: "⇪" }],
  },
];

export const ERP_NAV = [
  {
    group: "SUPPLY CHAIN",
    items: [
      { to: "/erp/gate", label: "Gate Entry", icon: "🚚" },
      { to: "/erp/inventory", label: "Inventory", icon: "📦" },
      { to: "/erp/microbial", label: "Cold Room", icon: "🧪" },
    ],
  },
  {
    group: "PRODUCTION",
    items: [
      { to: "/erp/bom", label: "BOM Issuance", icon: "⚗️" },
      { to: "/erp/planning", label: "Planning", icon: "📋" },
    ],
  },
  {
    group: "SALES",
    items: [{ to: "/erp/sales", label: "Sales Orders", icon: "💼" }],
  },
];

export const ROLE_BADGE = {
  admin: { bg: "#fef3c7", color: "#92400e" },
  store_manager: { bg: "#dcfce7", color: "#166534" },
  store_person: { bg: "#dbeafe", color: "#1e40af" },
  planning_manager: { bg: "#ede9fe", color: "#6b21a8" },
  production: { bg: "#fce7f3", color: "#9d174d" },
  sales: { bg: "#e0f2fe", color: "#0369a1" },
};

export const PAGE_NAMES = {
  gate: "🚚  Gate Entry",
  inventory: "📦  Inventory Management",
  bom: "⚗️   BOM Issuance",
  planning: "📋  Planning Engine",
  sales: "💼  Sales Orders",
  microbial: "🧪  Cold Room IMS",
};
