// Single source of truth for status/type badge colors — previously duplicated
// (and already drifted) between DataTable.jsx and RowDetailDrawer.jsx.
const STATUS_COLORS = {
  ACTIVE:           { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  EXHAUSTED:        { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  COMPLETED:        { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  CANCELLED:        { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
  AWAITING_INWARD:  { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  INWARDED:         { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  PENDING:          { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  RESERVED:         { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  PACK:             { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  BULK:             { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  IN:               { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  OUT:              { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  ADJUSTMENT:       { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
};

export default function Badge({ value, size = 'md' }) {
  const style = STATUS_COLORS[value];
  if (!style) return <span className="text-muted">{value}</span>;
  return (
    <span
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: 6,
        fontSize: size === 'sm' ? '0.73rem' : '0.78rem',
        fontWeight: 600,
        padding: '2px 8px',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {value}
    </span>
  );
}

export function BoolBadge({ value }) {
  return (
    <span
      style={{
        background: value ? '#ecfdf5' : '#f9fafb',
        color: value ? '#059669' : '#6b7280',
        border: `1px solid ${value ? '#a7f3d0' : '#e5e7eb'}`,
        borderRadius: 6,
        fontSize: '0.78rem',
        fontWeight: 600,
        padding: '2px 10px',
      }}
    >
      {value ? 'Yes' : 'No'}
    </span>
  );
}
