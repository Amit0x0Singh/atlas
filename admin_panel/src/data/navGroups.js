// Single source of truth for the resource groups — previously defined
// twice in different shapes (AdminLayout.jsx's GROUPS array, Dashboard.jsx's
// separate GROUP_LABELS/GROUP_COLORS maps).
export const NAV_GROUPS = [
  { key: 'masters',       label: 'Master Data',          color: '#0d9488' },
  { key: 'gate',          label: 'Gate & Supply Chain', color: '#f59e0b' },
  { key: 'inventory',     label: 'Inventory',            color: '#2563eb' },
  { key: 'sales',         label: 'Sales',                color: '#16a34a' },
  { key: 'production',    label: 'Production',           color: '#9333ea' },
  { key: 'planning',      label: 'Planning',              color: '#ea580c' },
  { key: 'hr',            label: 'HR',                    color: '#0891b2' },
  { key: 'microbial',     label: 'Microbial',             color: '#be185d' },
  { key: 'system',        label: 'System',                color: '#475569' },
  { key: 'notifications', label: 'Notifications',         color: '#ca8a04' },
  { key: 'legacy',        label: 'Legacy ERP (Review)',   color: '#6b7280' },
];
