import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Input from './Input.jsx';
import { verifyPassword } from '../../api/auth.js';

// Generic "prove you mean it" gate for destructive operations — composed
// alongside ConfirmDialog/DeleteDialog rather than extending them, since
// neither supports typed confirmation or a password field. Requires typing
// the given confirm word AND re-entering the current password; only calls
// onConfirm() after the backend actually verifies the password.
export default function DestructiveActionDialog({ open, title, summary, onConfirm, onCancel, confirmWord = 'DELETE', confirmLabel = 'Delete' }) {
  const [typedWord, setTypedWord] = useState('');
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const canSubmit = typedWord === confirmWord && password.length > 0 && !verifying;

  function reset() {
    setTypedWord(''); setPassword(''); setVerifying(false); setVerifyError('');
  }
  function handleCancel() {
    reset();
    onCancel();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await verifyPassword(password);
      if (!res?.success) {
        setVerifyError('Incorrect password.');
        setVerifying(false);
        return;
      }
    } catch (err) {
      setVerifyError(err?.response?.data?.error || 'Incorrect password.');
      setVerifying(false);
      return;
    }
    await onConfirm();
    reset();
  }

  return (
    <Modal open={open} onClose={verifying ? undefined : handleCancel} size="md">
      <div className="p-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 text-red-600 bg-red-50 dark:bg-red-950">
          <AlertTriangle size={22} />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{summary}</div>

        <div className="mt-5 space-y-4">
          <Input
            name="confirmWord"
            label={`Type ${confirmWord} to confirm`}
            value={typedWord}
            onChange={(e) => setTypedWord(e.target.value)}
            autoComplete="off"
          />
          <Input
            name="confirmPassword"
            label="Your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={verifyError || undefined}
            autoComplete="current-password"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" fullWidth onClick={handleCancel} disabled={verifying}>Cancel</Button>
          <Button variant="danger-solid" fullWidth loading={verifying} disabled={!canSubmit} onClick={handleSubmit}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
