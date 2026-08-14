import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import Button from '../common/Button.jsx';

// Small popover offering both download formats — the original backup file
// (needed for restore) and a derived .xlsx for reporting/analysis. Used from
// both BackupHistoryTable's row action and BackupDetailsDrawer's footer.
//
// Portaled to document.body and positioned from the trigger's own bounding
// rect (not rendered as a normal absolutely-positioned child) — the icon
// variant sits inside BackupHistoryTable's horizontally-scrollable table
// container, and a plain `position: absolute` popover gets silently clipped
// there: setting `overflow-x: auto` on an element with `overflow-y` left
// unset makes the browser compute overflow-y as `auto` too (per the CSS
// overflow spec), so the container clips vertically as well, cutting the
// dropdown off instead of letting it float above the page.
export default function DownloadMenu({ onDownloadOriginal, onExportExcel, disabled, variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    // Reposition on resize; close on scroll (of the table or the page) rather
    // than track it — simplest way to never show a stale-positioned popover.
    function onScroll() { setOpen(false); }
    function onResize() { setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  function choose(action) {
    setOpen(false);
    action();
  }

  return (
    <div className="inline-block">
      {variant === 'icon' ? (
        <button
          ref={triggerRef}
          type="button"
          title="Download"
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Download size={15} />
        </button>
      ) : (
        <span ref={triggerRef} className="inline-block">
          <Button variant="secondary" icon={Download} disabled={disabled} onClick={() => (open ? setOpen(false) : openMenu())}>
            Download
            <ChevronDown size={13} className="ml-1 flex-shrink-0" />
          </Button>
        </span>
      )}

      {open && coords && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: coords.top, right: coords.right }}
          className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-[100] py-1"
        >
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
              <span className="block text-[11px] text-slate-400">.xlsx — for reporting/analysis, or to restore from</span>
            </span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
