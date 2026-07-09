/**
 * PageHeader — the title bar used at the top of every page body.
 * Every page composes it the same way: an icon badge + title + description
 * on the left, action buttons (incl. BackButton) on the right, and an
 * optional row (tabs, filters) below via `children`. The description is
 * hidden on mobile — same reasoning each page used to apply individually:
 * the explainer isn't worth the vertical space on a small screen.
 *
 * `breadcrumb` is an optional small link rendered above the title — for
 * drill-down pages (e.g. a detail page reached from a list) that need a
 * "back to list" trail distinct from the page-level Back button in `actions`.
 */
export default function PageHeader({ icon: Icon, title, description, breadcrumb, actions, children, className = '' }) {
  return (
    <div className={`bg-white border-b border-gray-200 px-4 md:px-6 py-3.5 md:py-4 ${className}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Icon size={17} strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            {breadcrumb && <div className="-mt-0.5 mb-0.5">{breadcrumb}</div>}
            <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{title}</h1>
            {description && (
              <p className="hidden md:block text-xs text-gray-500 mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
