// Renders one control per entry in `fields` (a resolved list of resource
// field defs — see resolveFilterFields in ResourcePage.jsx), keyed by
// `field.type`:
//   - select (with options)      -> single-select pill group
//   - date / datetime-local      -> from/to range
//   - anything else (text, etc.) -> plain text input, sent server-side as
//                                    a case-insensitive `contains` filter
// `values` is `{ [field.name]: value }`; date-range values are
// `{ from, to }` objects, everything else is a plain string.
export default function FilterPanel({ fields = [], values = {}, onChange, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-72 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 p-4 space-y-4">
        {fields.map((field) => {
          const isDate = field.type === 'date' || field.type === 'datetime-local';
          const isSelect = field.type === 'select' && field.options?.length;
          const value = values[field.name];

          if (isSelect) {
            return (
              <div key={field.name}>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{field.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChange(field.name, '')}
                    className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${!value ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    All
                  </button>
                  {field.options.map((opt) => {
                    const optValue = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    return (
                      <button
                        key={optValue}
                        type="button"
                        onClick={() => onChange(field.name, optValue)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${value === optValue ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        {optLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (isDate) {
            const range = value || {};
            return (
              <div key={field.name}>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{field.label} range</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={range.from || ''}
                    onChange={(e) => onChange(field.name, { ...range, from: e.target.value })}
                    className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={range.to || ''}
                    onChange={(e) => onChange(field.name, { ...range, to: e.target.value })}
                    className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={field.name}>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{field.label}</p>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(field.name, e.target.value)}
                placeholder={`Filter by ${field.label.toLowerCase()}…`}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
