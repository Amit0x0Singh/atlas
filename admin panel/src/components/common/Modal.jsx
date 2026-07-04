import { useEffect } from 'react';

/**
 * Generic modal shell — backdrop + card, built on the existing
 * .modal-backdrop-custom/.modal-card classes in styles.css.
 * Replaces the hand-rolled overlay markup previously duplicated in
 * DataFormModal.jsx and ResourcePage.jsx's inline Delete-All dialog.
 */
export default function Modal({ open, onClose, maxWidth, children }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop-custom"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
