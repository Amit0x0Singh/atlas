import Modal from './Modal.jsx';

/**
 * Shared confirm dialog — replaces window.confirm() for per-row delete and
 * the inline hand-rolled "Delete All" modal in ResourcePage.jsx, so both
 * destructive actions get the same styled confirmation UX.
 */
export default function ConfirmDialog({
  open,
  icon = '⚠️',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth={440}>
      <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 36 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', textAlign: 'center', fontSize: '1.15rem' }}>{title}</h3>
      <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.9rem', margin: '0 0 24px' }}>
        {message}
      </p>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
