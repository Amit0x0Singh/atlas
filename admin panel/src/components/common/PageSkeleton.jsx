function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`} />;
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <Pulse className="h-3 w-20 mb-3" />
          <Pulse className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="p-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3.5 px-3 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Pulse key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PageSkeleton() {
  return (
    <div className="space-y-6">
      <StatsSkeleton />
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <TableSkeleton />
      </div>
    </div>
  );
}
