export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-0.5">{eyebrow}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl truncate" title={description}>{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
