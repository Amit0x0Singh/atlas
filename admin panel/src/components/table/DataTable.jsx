import Badge, { BoolBadge } from '../common/Badge.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Spinner from '../common/Spinner.jsx';

function CellValue({ value, fieldName }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted">—</span>;
  if (Array.isArray(value)) return <span className="font-monospace" style={{ fontSize: '0.8rem' }}>{value.join(', ')}</span>;
  if (typeof value === 'boolean') return <BoolBadge value={value} />;
  if (
    fieldName?.toLowerCase().includes('status') ||
    fieldName?.toLowerCase().includes('type') ||
    fieldName?.toLowerCase().includes('tracking')
  ) {
    return <Badge value={String(value)} size="sm" />;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return <span style={{ fontSize: '0.82rem', color: '#475467' }}>{new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
  }
  const str = String(value);
  const truncated = str.length > 28 ? str.slice(0, 26) + '…' : str;
  return <span title={str.length > 28 ? str : undefined}>{truncated}</span>;
}

function getRowKey(record, resource, fallback) {
  if (Array.isArray(resource.idField)) {
    return resource.idField.map((f) => record[f]).join('-') || fallback;
  }
  return record[resource.idField] || fallback;
}

// Show first 5 fields as preview columns; rest visible in the drawer
const MAX_PREVIEW = 5;

export default function DataTable({ resource, records, loading, onRowClick, onEdit, onDelete }) {
  const previewFields = resource.fields.slice(0, MAX_PREVIEW);

  if (loading) return <Spinner label="Loading records…" />;
  if (!records.length) return <EmptyState message="No records found." />;

  return (
    <div className="data-table-wrap">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            {previewFields.map((f) => (
              <th key={f.name}>{f.label}</th>
            ))}
            {resource.fields.length > MAX_PREVIEW && (
              <th style={{ color: '#9aa9bd', fontStyle: 'italic', fontWeight: 400 }}>
                +{resource.fields.length - MAX_PREVIEW} more
              </th>
            )}
            <th className="text-end" style={{ width: 110 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr
              key={getRowKey(record, resource, index)}
              className="table-row-clickable"
              onClick={() => onRowClick(record)}
              title="Click to view full record"
            >
              {previewFields.map((f) => (
                <td key={f.name}>
                  <CellValue value={record[f.name]} fieldName={f.name} />
                </td>
              ))}
              {resource.fields.length > MAX_PREVIEW && (
                <td>
                  <span style={{ color: '#9aa9bd', fontSize: '0.8rem' }}>View all →</span>
                </td>
              )}
              <td className="text-end action-cell" onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => onEdit(record)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(record)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
