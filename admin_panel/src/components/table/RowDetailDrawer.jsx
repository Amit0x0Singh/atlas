import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Pencil, Trash2, Pin, PinOff } from 'lucide-react';
import StatusBadge, { BoolBadge } from '../common/StatusBadge.jsx';
import Button from '../common/Button.jsx';
import { toTitleCase } from '../../utils/textDisplay.js';

function renderValue(value, fieldName, fieldType, titleCase) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-300 dark:text-slate-600 italic">empty</span>;
  }
  if (fieldType === 'json') {
    return (
      <pre className="font-mono text-xs whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-800 rounded px-2 py-1.5 text-slate-600 dark:text-slate-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span key={i} className="bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 text-xs font-mono text-slate-600 dark:text-slate-300">
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === 'boolean') return <BoolBadge value={value} />;
  if (/status|type|tracking|flagged/i.test(fieldName || '')) return <StatusBadge value={String(value)} />;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    return (
      <span>
        {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
        <span className="text-slate-400 dark:text-slate-500 text-xs">
          {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </span>
    );
  }
  const str = titleCase ? toTitleCase(String(value)) : String(value);
  if (str.length > 60) {
    return (
      <span className="block font-mono text-xs break-all bg-slate-50 dark:bg-slate-800 rounded px-2 py-1.5 text-slate-600 dark:text-slate-300">
        {str}
      </span>
    );
  }
  return <span>{str}</span>;
}

export default function RowDetailDrawer({ resource, record, onClose, onEdit, onDelete, isPinned, onTogglePin }) {
  const titleField = resource.fields.find(
    (f) => f.name.toLowerCase().includes('name') || f.name.toLowerCase().includes('id')
  );
  const titleRaw = record && (titleField ? String(record[titleField.name] ?? '') : resource.title);
  const title = record && titleField?.titleCase ? toTitleCase(titleRaw) : titleRaw;

  return createPortal(
    <AnimatePresence>
      {record && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 z-[90]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] bg-white dark:bg-slate-900 shadow-2xl z-[95] flex flex-col"
          >
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{resource.model}</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{title || resource.title}</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-2">
              {resource.fields.map((field) => (
                <div key={field.name} className="grid grid-cols-[140px_1fr] gap-4 py-3 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide pt-0.5">{field.label}</div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 break-words">{renderValue(record[field.name], field.name, field.type, field.titleCase)}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              {onTogglePin && (
                <Button variant="secondary" icon={isPinned ? PinOff : Pin} onClick={onTogglePin}>
                  {isPinned ? 'Unpin' : 'Pin'}
                </Button>
              )}
              <Button variant="secondary" icon={Pencil} onClick={() => onEdit(record)}>Edit</Button>
              <Button variant="danger" icon={Trash2} onClick={() => onDelete(record)} className="ml-auto">Delete</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
