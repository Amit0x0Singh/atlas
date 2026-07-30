import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import Button from '../common/Button.jsx';

// Small popover offering both download formats — the original backup file
// (needed for restore) and a derived .xlsx for reporting/analysis. Used from
// both BackupHistoryTable's row action and BackupDetailsDrawer's footer.
export default function DownloadMenu({ onDownloadOriginal, onExportExcel, disabled, variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function choose(action) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative inline-block" ref={ref}>
      {variant === 'icon' ? (
        <button
          type="button"
          title="Download"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Download size={15} />
        </button>
      ) : (
        <Button variant="secondary" icon={Download} disabled={disabled} onClick={() => setOpen((v) => !v)}>
          Download
          <ChevronDown size={13} className="ml-1 flex-shrink-0" />
        </Button>
      )}

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 py-1">
          <button
            type="button"
            onClick={() => choose(onDownloadOriginal)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
          >
            <Download size={14} className="text-slate-400 flex-shrink-0" />
            <span>
              Download Backup
              <span className="block text-[11px] text-slate-400">Original format — for restore</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => choose(onExportExcel)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
          >
            <FileSpreadsheet size={14} className="text-green-600 flex-shrink-0" />
            <span>
              Export to Excel
              <span className="block text-[11px] text-slate-400">.xlsx — for reporting/analysis</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
