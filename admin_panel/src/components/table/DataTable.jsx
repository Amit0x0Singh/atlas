import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns3, Loader2 } from 'lucide-react';
import StatusBadge, { BoolBadge } from '../common/StatusBadge.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { TableSkeleton } from '../common/PageSkeleton.jsx';
import ActionMenu from './ActionMenu.jsx';

function CellValue({ value, fieldName, fieldType }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-300 dark:text-slate-600">—</span>;
  }
  if (fieldType === 'json') {
    const count = Array.isArray(value) ? value.length : Object.keys(value).length;
    return <span className="text-xs text-slate-500 dark:text-slate-400 italic">{count} item{count !== 1 ? 's' : ''}</span>;
  }
  if (Array.isArray(value)) {
    return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{value.join(', ')}</span>;
  }
  if (typeof value === 'boolean') return <BoolBadge value={value} />;
  if (/status|type|tracking|flagged/i.test(fieldName || '')) return <StatusBadge value={String(value)} size="sm" />;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return (
      <span className="text-slate-500 dark:text-slate-400">
        {new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
    );
  }
  const str = String(value);
  const truncated = str.length > 32 ? str.slice(0, 30) + '…' : str;
  return <span title={str.length > 32 ? str : undefined}>{truncated}</span>;
}

function getRowKey(record, resource, fallback) {
  if (Array.isArray(resource.idField)) {
    return resource.idField.map((f) => record[f]).join('-') || fallback;
  }
  return record[resource.idField] ?? fallback;
}

const DEFAULT_VISIBLE = 6;

export default function DataTable({
  resource, records, loading,
  onRowClick, onEdit, onDelete, onDuplicate,
  selectedIds, onSelectionChange,
  // Header checkbox state/handler are controlled by the parent — "select
  // all" needs to reach every record matching the current filters across
  // the whole resource, not just the rows loaded on this page, so the
  // parent (which owns pagination + filters) decides what "all" means.
  allSelected, someSelected, onToggleAll, selectingAll,
}) {
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const vis = {};
    resource.fields.forEach((f, i) => { vis[f.name] = i < DEFAULT_VISIBLE; });
    return vis;
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const columns = useMemo(() => resource.fields.map((f) => ({
    id: f.name,
    accessorKey: f.name,
    header: f.label,
    size: 180,
    cell: (info) => <CellValue value={info.getValue()} fieldName={f.name} fieldType={f.type} />,
  })), [resource]);

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });

  if (loading) {
    return <TableSkeleton columns={Math.min(resource.fields.length, DEFAULT_VISIBLE) + 1} />;
  }
  if (!records.length) {
    return <EmptyState title="No records found" description="Try adjusting your search or filters." />;
  }

  function toggleRow(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  }

  return (
    <div className="relative">
      <div className="flex justify-end px-2 pt-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColumnMenu((s) => !s)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Columns3 size={13} /> Columns
          </button>
          {showColumnMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)} />
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-20 py-1.5 max-h-72 overflow-y-auto">
                {table.getAllLeafColumns().map((col) => (
                  <label key={col.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {col.columnDef.header}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/90 backdrop-blur">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                <th className="sticky left-0 z-20 bg-slate-50/95 dark:bg-slate-900/90 w-10 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
                  {selectingAll ? (
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                  ) : (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={onToggleAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                </th>
                {hg.headers.map((header, idx) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={[
                      'relative text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[11px] px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 select-none',
                      idx === 0 ? 'sticky left-10 z-20 bg-slate-50/95 dark:bg-slate-900/90' : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: <ChevronUp size={12} />, desc: <ChevronDown size={12} /> }[header.column.getIsSorted()]
                        ?? <ChevronsUpDown size={12} className="opacity-30" />}
                    </button>
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                    />
                  </th>
                ))}
                <th className="w-28 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800" />
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, rIdx) => {
              const id = getRowKey(row.original, resource, rIdx);
              const selected = selectedIds.has(id);
              const stickyBg = selected
                ? 'bg-blue-50/60 dark:bg-blue-950/30'
                : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40';
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.original)}
                  className={[
                    'group cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0',
                    selected ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                  ].join(' ')}
                >
                  <td className={`sticky left-0 z-[5] px-3 py-2.5 ${stickyBg}`} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRow(id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  {row.getVisibleCells().map((cell, cIdx) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={[
                        'px-3 py-2.5 text-slate-700 dark:text-slate-300 truncate',
                        cIdx === 0 ? `sticky left-10 z-[5] ${stickyBg}` : '',
                      ].join(' ')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      onView={() => onRowClick(row.original)}
                      onEdit={() => onEdit(row.original)}
                      onDuplicate={() => onDuplicate(row.original)}
                      onDelete={() => onDelete(row.original)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
