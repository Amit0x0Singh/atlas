import { motion } from 'framer-motion';

// Nothing like this exists elsewhere in the app — built fresh for backup/
// restore progress. Indeterminate mode covers the brief window before a job
// reports its table count; determinate mode after that.
export default function ProgressBar({ value = 0, max = 0, label, indeterminate = false }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      {label && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 truncate">{label}</p>}
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {indeterminate ? (
          <motion.div
            className="h-full w-1/3 rounded-full bg-blue-600"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full bg-blue-600"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </div>
    </div>
  );
}
