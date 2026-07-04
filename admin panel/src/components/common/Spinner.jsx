export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="empty-state">
      <div className="spinner-border spinner-border-sm text-secondary me-2" role="status" />
      {label}
    </div>
  );
}
