const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2' };

export default function FormSection({ title, description, columns = 2, children, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {(title || description) && (
        <div className="pb-1">
          {title && <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</h4>}
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      )}
      <div className={`grid ${COLS[columns] || COLS[2]} gap-4`}>
        {children}
      </div>
    </div>
  );
}
