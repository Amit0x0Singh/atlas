import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({
  open,
  icon: Icon = AlertTriangle,
  iconClassName = 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="p-6 text-center">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${iconClassName}`}>
          <Icon size={22} />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{message}</div>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant} fullWidth onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
