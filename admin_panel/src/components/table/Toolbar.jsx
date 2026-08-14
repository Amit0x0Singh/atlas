import { useState } from 'react';
import { SlidersHorizontal, Download, Upload, RefreshCw, RotateCcw } from 'lucide-react';
import Button from '../common/Button.jsx';
import SearchBar from './SearchBar.jsx';
import FilterPanel from './FilterPanel.jsx';

function isActiveFilterValue(v) {
  if (v == null || v === '') return false;
  if (typeof v === 'object') return !!(v.from || v.to);
  return true;
}

export default function Toolbar({
  searchRef, query, onQueryChange,
  filterFields = [], filterValues = {}, onFilterChange,
  onExport, onImport, onRefresh, onReset,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = Object.values(filterValues).filter(isActiveFilterValue).length;
  const hasAnyActive = activeFilterCount > 0 || !!query;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBar
        ref={searchRef}
        value={query}
        onChange={onQueryChange}
        placeholder="Search all fields…"
        className="flex-1 min-w-[180px] max-w-sm"
      />

      {filterFields.length > 0 && (
        <div className="relative">
          <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setFilterOpen((o) => !o)}>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px]">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {filterOpen && (
            <FilterPanel
              fields={filterFields}
              values={filterValues}
              onChange={onFilterChange}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 sm:ml-auto">
        {hasAnyActive && (
          <Button variant="ghost" icon={RotateCcw} onClick={onReset}>
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
        <Button variant="secondary" icon={Upload} onClick={onImport}>
          <span className="hidden sm:inline">Import</span>
        </Button>
        <Button variant="secondary" icon={Download} onClick={onExport}>
          <span className="hidden sm:inline">Export</span>
        </Button>
        <Button variant="secondary" icon={RefreshCw} onClick={onRefresh}>
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </div>
  );
}
