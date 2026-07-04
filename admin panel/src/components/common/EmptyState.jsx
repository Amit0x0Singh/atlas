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
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
        <Icon size={28} className="text-slate-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </div>
  );
}
