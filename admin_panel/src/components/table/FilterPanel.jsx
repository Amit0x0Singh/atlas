export default function FilterPanel({
  statusField, statusOptions = [], statusValue, onStatusChange,
  dateField, dateRange, onDateRangeChange,
  onClose,
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 p-4 space-y-4">
        {statusField && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{statusField.label}</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onStatusChange('')}
                className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${!statusValue ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                All
              </button>
              {statusOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onStatusChange(opt)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${statusValue === opt ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {dateField && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{dateField.label} range</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange?.from || ''}
                onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={dateRange?.to || ''}
                onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
