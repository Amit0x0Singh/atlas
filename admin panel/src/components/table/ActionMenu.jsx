import { Eye, Pencil, Copy, Trash2 } from 'lucide-react';

export default function ActionMenu({ onView, onEdit, onDuplicate, onDelete }) {
  const items = [
    { key: 'view',      icon: Eye,    onClick: onView,      title: 'View',      className: 'hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950' },
    { key: 'edit',      icon: Pencil, onClick: onEdit,      title: 'Edit',      className: 'hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950' },
    { key: 'duplicate', icon: Copy,   onClick: onDuplicate, title: 'Duplicate', className: 'hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200' },
    { key: 'delete',    icon: Trash2, onClick: onDelete,    title: 'Delete',    className: 'hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950' },
  ];
  return (
    <div className="inline-flex items-center gap-0.5">
      {items.map(({ key, icon: Icon, onClick, title, className }) => onClick && (
        <button
          key={key}
          type="button"
          title={title}
          onClick={onClick}
          className={`p-1.5 rounded-md text-slate-400 transition-colors ${className}`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
