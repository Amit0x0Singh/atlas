const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

/**
 * Wires the backend's already-existing page/limit/total contract
 * (backend/src/modules/admin_panel/get/admin_panel.controller.js defaults to
 * page=1, limit=200 and always returns { data, total, page, limit } —
 * previously the UI never surfaced this, so tables over 200 rows were
 * silently truncated with no way to reach the rest).
 */
export default function Pagination({ page, limit, total, onPageChange, onLimitChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit && page === 1) {
    // Still show the page-size selector so users can raise the limit proactively,
    // but skip prev/next controls when everything already fits on one page.
    if (total <= PAGE_SIZE_OPTIONS[0]) return null;
  }

  return (
    <div className="d-flex align-items-center justify-content-between mt-3">
      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
      </div>
      <div className="d-flex align-items-center gap-2">
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto' }}
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Page {page} of {totalPages}</span>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
