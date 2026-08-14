import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  primaryAction,
  secondaryAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-10 px-6 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <Icon size={22} className="text-slate-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 mt-4">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </div>
  );
}
