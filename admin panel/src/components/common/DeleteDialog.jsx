import { Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog.jsx';

// Danger-variant preset of ConfirmDialog — composition, not a duplicate implementation.
export default function DeleteDialog({
  title = 'Delete this record?',
  message = 'This action cannot be undone.',
  ...rest
}) {
  return (
    <ConfirmDialog
      icon={Trash2}
      iconClassName="text-red-600 bg-red-50 dark:bg-red-950"
      title={title}
      message={message}
      confirmLabel="Delete"
      variant="danger-solid"
      {...rest}
    />
  );
}
