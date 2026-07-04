export default function EmptyState({ message = 'No records found.' }) {
  return (
    <div className="empty-state">
      <svg width="40" height="40" fill="none" stroke="#bdc7d4" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
      <div>{message}</div>
    </div>
  );
}
