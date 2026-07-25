import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ label = 'Saving…' }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-[1px] rounded-xl">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
        <Loader2 size={16} className="animate-spin" />
        {label}
      </div>
    </div>
  );
}
