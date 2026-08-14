function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`} />;
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <Pulse className="h-2.5 w-16 mb-2" />
          <Pulse className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="p-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1.5 px-2.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
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
    <div className="space-y-4">
      <StatsSkeleton />
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <TableSkeleton />
      </div>
    </div>
  );
}
