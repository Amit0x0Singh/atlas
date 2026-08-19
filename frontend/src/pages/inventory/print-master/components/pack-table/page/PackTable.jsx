import { useState, useMemo, useEffect } from "react";
import { usePacks } from "../../../hooks/usePacks.js";
import Pagination from "../../../../../../components/pagination/Pagination.jsx";
import { groupPacks, groupStatus } from "../utils/groupPacks.js";
import PackTableToolbar from "../components/PackTableToolbar.jsx";
import PackTableFilterToolbar, { EMPTY_PACK_TABLE_FILTERS, DEFAULT_PACK_TABLE_SORT } from "../components/PackTableFilterToolbar.jsx";
import PackTableRow from "../components/PackTableRow.jsx";
import { ColumnsMenu } from "../../../../../../components/ui/index.js";
import { useColumnPreferences } from "../../../../../../hooks/useColumnPreferences.js";

// Resizable columns — same drag-handle mechanism as the Item/Product/
// Equipment Master tables. The leading expand-arrow column and the trailing
// "Print All QRs" column stay fixed width; PackTableRow.jsx needs no changes
// — it inherits column widths from the header row under table-layout:fixed.
const COLUMN_DEFS = [
  { key: 'item',        label: 'Item',           defaultWidth: 220 },
  { key: 'lotInvoice',  label: 'Lot / Invoice',  defaultWidth: 160 },
  { key: 'supplier',    label: 'Supplier',       defaultWidth: 140 },
  { key: 'bags',        label: 'Bags',           defaultWidth: 80  },
  { key: 'totalQty',    label: 'Total Qty',      defaultWidth: 120 },
  { key: 'received',    label: 'Received',       defaultWidth: 120 },
  { key: 'status',      label: 'Status',         defaultWidth: 120 },
]
const EXPAND_COL_WIDTH = 32
const PRINT_COL_WIDTH  = 150

export default function PackTable({ reloadTrigger }) {
  const [filterCode, setFilterCode]     = useState("");
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [filters, setFilters]            = useState(EMPTY_PACK_TABLE_FILTERS);
  const [sort, setSort]                  = useState(DEFAULT_PACK_TABLE_SORT);
  const [page, setPage]                  = useState(1);
  const [limit, setLimit]                = useState(15);
  const { packs, loading }              = usePacks(filterCode, reloadTrigger);

  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('print-master-packs', COLUMN_DEFS)

  const allGroups = useMemo(() => groupPacks(packs), [packs]);

  // "Status" filter drives the existing pending/completed split — Pending
  // only (default) hides fully-scanned invoices, "Show completed too" shows
  // everything. The small toolbar's completed badge stays wired to the same
  // filters.status field so both controls always agree.
  const showCompleted = filters.status === 'ALL'

  // A group is "pending" if at least one bag is still AWAITING_INWARD
  const pendingGroups   = useMemo(() => allGroups.filter(g => g.bags.some(b => b.status === 'AWAITING_INWARD')), [allGroups]);
  const completedGroups = useMemo(() => allGroups.filter(g => g.bags.every(b => b.status !== 'AWAITING_INWARD')), [allGroups]);
  const statusFiltered  = showCompleted ? allGroups : pendingGroups;

  const groups = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...statusFiltered].sort((a, b) => {
      if (sort.field === 'itemName') return dir * (a.itemName || '').localeCompare(b.itemName || '')
      if (sort.field === 'bags') return dir * (a.bags.length - b.bags.length)
      return dir * (new Date(a.receivedDate || 0) - new Date(b.receivedDate || 0)) // 'receivedDate'
    })
  }, [statusFiltered, sort])

  const paginatedGroups = groups.slice((page - 1) * limit, page * limit);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, [filters, filterCode, sort]);

  const toggle = (key) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const expandAll  = () => setExpandedKeys(new Set(groups.map((g) => g.key)));
  const collapseAll = () => setExpandedKeys(new Set());

  function exportPackTableCsv() {
    if (!groups.length) { alert('No records to export — adjust your filters.'); return }
    const headers = ['Item Name', 'Item Code', 'Lot No', 'Invoice No', 'Supplier', 'Bags', 'Total Qty', 'Status']
    const rows = groups.map(g => {
      const totalQty = g.bags.reduce((s, b) => s + (b.packQty || 0), 0)
      return [
        g.itemName || '', g.itemCode || '', g.lotNo || '', g.invoiceNo || '', g.supplier || '',
        g.bags.length, totalQty, groupStatus(g.bags).replace(/_/g, ' '),
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `pack_records_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4">
        <PackTableToolbar
          loading={loading}
          pendingGroups={pendingGroups}
          completedGroups={completedGroups}
          allGroups={allGroups}
          packs={packs}
          showCompleted={showCompleted}
          setShowCompleted={(fn) => setFilters(f => ({ ...f, status: (typeof fn === 'function' ? fn(showCompleted) : fn) ? 'ALL' : '' }))}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />
      </div>

      <PackTableFilterToolbar
        search={filterCode} onSearchChange={setFilterCode}
        filters={filters} onFiltersChange={setFilters}
        sort={sort} onSortChange={setSort}
        onExport={exportPackTableCsv}
        resultCount={groups.length}
      />

      <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
        <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
      </div>

      {loading ? (
        <p className="text-gray-400 py-8 text-center">Loading…</p>
      ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
              <tr className="text-gray-600 text-xs">
                <th style={{ width: EXPAND_COL_WIDTH }} className="px-3 py-2.5" />
                {visibleColumns.map(c => (
                  <th
                    key={c.key}
                    style={{ width: columnWidths[c.key] }}
                    className="relative text-left px-3 py-2.5 font-semibold select-none"
                  >
                    {c.label}
                    <div
                      onMouseDown={startResize(c.key)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                    />
                  </th>
                ))}
                <th style={{ width: PRINT_COL_WIDTH }} className="text-left px-3 py-2.5 font-semibold">Print All QRs</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="text-center py-10 text-gray-400">
                    {!showCompleted && completedGroups.length > 0
                      ? `All ${completedGroups.length} invoice(s) are fully scanned.`
                      : "No pack records found."}
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g) => (
                  <PackTableRow key={g.key} group={g} isOpen={expandedKeys.has(g.key)} onToggle={() => toggle(g.key)} columnVisibility={columnVisibility} colSpan={visibleColumns.length + 2} />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-3">
          <Pagination page={page} total={groups.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
        </div>
        </>
      )}
    </div>
  );
}
