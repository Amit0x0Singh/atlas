import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PanelLeftClose, PanelLeftOpen, Search, Star, LayoutDashboard, LogOut, ChevronDown,
  Layers, Truck, Package, ShoppingBag, Factory, CalendarDays, Users, Microscope,
  ShieldCheck, Bell, Archive, DatabaseBackup,
} from 'lucide-react';
import { resources } from '../../data/resources.js';
import { NAV_GROUPS } from '../../data/navGroups.js';
import { useFavorites } from '../../hooks/useFavorites.js';
import { useRecentPages } from '../../hooks/useRecentPages.js';
import { useAuth } from '../../context/AuthContext.jsx';

export const EXPANDED_WIDTH = 280;
export const COLLAPSED_WIDTH = 72;

// One icon per group — shown next to the group label, and standalone on the
// 72px collapsed rail where there's no room for the full accordion.
const GROUP_ICONS = {
  masters: Layers,
  gate: Truck,
  inventory: Package,
  sales: ShoppingBag,
  production: Factory,
  planning: CalendarDays,
  hr: Users,
  microbial: Microscope,
  system: ShieldCheck,
  notifications: Bell,
  legacy: Archive,
};

// Groups that start open on a fresh session — everything else stays
// collapsed so a 10-group / 87-table nav doesn't force endless scrolling.
const INITIALLY_OPEN = new Set(['masters']);

function ResourceNavItem({ resource, isFavorite, onToggleFavorite }) {
  return (
    <NavLink
      to={`/${resource.path}`}
      className={({ isActive }) => [
        'group flex items-center gap-2.5 rounded-lg pl-2.5 pr-2 py-2 text-sm transition-colors border-l-2',
        isActive
          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-medium'
          : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200',
      ].join(' ')}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current opacity-50" />
      <span className="truncate flex-1">{resource.title}</span>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(resource.key); }}
          className={[
            'transition-opacity flex-shrink-0',
            isFavorite ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400',
          ].join(' ')}
        >
          <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}
    </NavLink>
  );
}

// Collapsible accordion group — only the open group(s) render their items,
// which is what keeps the nav scrollable instead of one giant always-open list.
function NavGroup({ group, items, collapsed, isOpen, hasActive, onToggle, isFavorite, onToggleFavorite }) {
  const Icon = GROUP_ICONS[group.key];

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={group.label}
        className={[
          'w-full flex items-center justify-center py-2 rounded-lg transition-colors',
          hasActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60',
        ].join(' ')}
      >
        {Icon && <Icon size={18} />}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        {Icon && <Icon size={13} style={{ color: group.color }} className="flex-shrink-0" />}
        <span
          className={[
            'flex-1 text-left text-[10px] font-bold uppercase tracking-wider',
            hasActive ? '' : 'text-slate-400 dark:text-slate-500',
          ].join(' ')}
          style={hasActive ? { color: group.color } : undefined}
        >
          {group.label}
        </span>
        <ChevronDown
          size={13}
          className={`flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-0.5 mt-1">
          {items.map((r) => (
            <ResourceNavItem
              key={r.key}
              resource={r}
              isFavorite={isFavorite(r.key)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const [navFilter, setNavFilter] = useState('');
  const [openGroups, setOpenGroups] = useState(() => new Set(INITIALLY_OPEN));
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { recent } = useRecentPages();
  const { user, logout, isReadOnly } = useAuth();
  const location = useLocation();

  const resourceByKey = useMemo(() => Object.fromEntries(resources.map((r) => [r.key, r])), []);

  const filter = navFilter.trim().toLowerCase();
  const grouped = NAV_GROUPS.map((g) => ({
    ...g,
    items: resources.filter((r) => r.group === g.key && (!filter || r.title.toLowerCase().includes(filter))),
  })).filter((g) => g.items.length > 0);

  // Whichever group holds the active route auto-opens, so deep-linking or
  // clicking a favorite/recent item never lands on a collapsed section.
  useEffect(() => {
    const activePath = location.pathname.replace(/^\//, '');
    const activeResource = resources.find((r) => r.path === activePath);
    if (activeResource) {
      setOpenGroups((prev) => new Set(prev).add(activeResource.group));
    }
  }, [location.pathname]);

  const toggleGroup = (key) => {
    if (collapsed) onToggleCollapse();
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const favoriteResources = favorites.map((k) => resourceByKey[k]).filter(Boolean);
  const recentResources = recent
    .map((k) => resourceByKey[k])
    .filter(Boolean)
    .filter((r) => !favorites.includes(r.key));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={onCloseMobile} />
      )}

      <motion.aside
        animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={[
          'fixed lg:sticky top-0 h-screen z-50 lg:z-0 flex flex-col flex-shrink-0',
          'bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800',
          'transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className={[
          'flex items-center h-16 border-b border-slate-100 dark:border-slate-800 flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
        ].join(' ')}>
          {collapsed ? (
            // Collapsed rail is only 72px wide — logo mark doubles as the
            // expand button here instead of fitting two separate elements.
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="hidden lg:flex w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white items-center justify-center flex-shrink-0"
            >
              <PanelLeftOpen size={16} />
            </button>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">A</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Atlas</p>
                <p className="text-[11px] text-slate-400 truncate">Admin Data Panel</p>
              </div>
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                className="hidden lg:flex ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
              >
                <PanelLeftClose size={16} />
              </button>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="px-3 pt-3 flex-shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={navFilter}
                onChange={(e) => setNavFilter(e.target.value)}
                placeholder="Search modules…"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2.5 py-3 space-y-1">
          <NavLink
            to="/"
            end
            title={collapsed ? 'Dashboard' : undefined}
            className={({ isActive }) => [
              'flex items-center gap-2.5 rounded-lg pl-2.5 pr-2 py-2 text-sm font-medium transition-colors border-l-2 mb-3',
              isActive
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60',
              collapsed ? 'justify-center px-2' : '',
            ].join(' ')}
          >
            <LayoutDashboard size={16} className="flex-shrink-0" />
            {!collapsed && 'Dashboard'}
          </NavLink>

          <NavLink
            to="/backup-restore"
            title={collapsed ? 'Backup & Restore' : undefined}
            className={({ isActive }) => [
              'flex items-center gap-2.5 rounded-lg pl-2.5 pr-2 py-2 text-sm font-medium transition-colors border-l-2 mb-3',
              isActive
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60',
              collapsed ? 'justify-center px-2' : '',
            ].join(' ')}
          >
            <DatabaseBackup size={16} className="flex-shrink-0" />
            {!collapsed && 'Backup & Restore'}
          </NavLink>

          {!collapsed && favoriteResources.length > 0 && (
            <div className="mb-3">
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 text-amber-500">Favorites</p>
              <div className="space-y-0.5">
                {favoriteResources.map((r) => (
                  <ResourceNavItem key={r.key} resource={r} isFavorite onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            </div>
          )}

          {!collapsed && recentResources.length > 0 && (
            <div className="mb-3">
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400 dark:text-slate-500">Recent</p>
              <div className="space-y-0.5">
                {recentResources.map((r) => (
                  <ResourceNavItem key={r.key} resource={r} isFavorite={isFavorite(r.key)} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            </div>
          )}

          {grouped.map((group) => {
            const hasActive = group.items.some((r) => `/${r.path}` === location.pathname);
            const isOpen = Boolean(filter) || openGroups.has(group.key);
            return (
              <NavGroup
                key={group.key}
                group={group}
                items={group.items}
                collapsed={collapsed}
                isOpen={isOpen}
                hasActive={hasActive}
                onToggle={() => toggleGroup(group.key)}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
              />
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 px-3 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
            {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{user?.full_name || user?.email}</p>
                <p className="text-[11px] text-slate-400 truncate">{isReadOnly ? 'Read-only' : 'Full access'}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Log out"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 flex-shrink-0"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </motion.aside>
    </>
  );
}
