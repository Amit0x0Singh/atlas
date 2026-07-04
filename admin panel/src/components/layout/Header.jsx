import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, Sun, Moon, Search, Plus, ChevronRight } from 'lucide-react';
import { resources } from '../../data/resources.js';
import { useTheme } from '../../hooks/useTheme.js';

export default function Header({ onOpenMobileSidebar, onQuickCreate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [globalQuery, setGlobalQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const currentResource = useMemo(
    () => resources.find((r) => location.pathname === `/${r.path}`),
    [location.pathname]
  );

  const matches = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return [];
    return resources
      .filter((r) => r.title.toLowerCase().includes(q) || r.model.toLowerCase().includes(q))
      .slice(0, 8);
  }, [globalQuery]);

  function goTo(resource) {
    navigate(`/${resource.path}`);
    setGlobalQuery('');
    setShowResults(false);
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 h-16 px-4 sm:px-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Menu size={18} />
      </button>

      <nav className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400 min-w-0">
        <span>Dashboard</span>
        {currentResource && (
          <>
            <ChevronRight size={13} />
            <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{currentResource.title}</span>
          </>
        )}
      </nav>

      <div className="flex-1" />

      <div className="relative hidden md:block w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={globalQuery}
          onChange={(e) => { setGlobalQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder="Jump to a table…"
          className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showResults && matches.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto z-40">
            {matches.map((r) => (
              <button
                key={r.key}
                type="button"
                onMouseDown={() => goTo(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2"
              >
                <span className="text-slate-700 dark:text-slate-200 truncate">{r.title}</span>
                <span className="text-[10px] uppercase text-slate-400 flex-shrink-0">{r.model}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Notifications"
      >
        <Bell size={17} />
      </button>

      <button
        type="button"
        onClick={toggle}
        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {currentResource && (
        <button
          type="button"
          onClick={() => onQuickCreate?.(currentResource)}
          className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={15} /> Quick Create
        </button>
      )}
    </header>
  );
}
