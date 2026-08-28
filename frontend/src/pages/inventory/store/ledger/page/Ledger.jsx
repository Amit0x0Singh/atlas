import { useState, useEffect } from 'react'
import { ledgerApi } from '../../../../../api/inventory.js'
import { BackButton, Button, PageHeader } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import LedgerTable             from '../components/ledger-table/LedgerTable.jsx'
import LedgerToolbar, { EMPTY_LEDGER_FILTERS, DEFAULT_LEDGER_SORT } from '../components/ledger-filters/LedgerToolbar.jsx'
import TransactionDetailModal  from '../components/transaction-detail-modal/TransactionDetailModal.jsx'
import { RefreshCw, ScrollText } from 'lucide-react'
import { useLedger } from '../../../../../hooks/inventory/useLedger.js'
import { useDebouncedValue } from '../../../../../hooks/useDebouncedValue.js'
import { useUserDisplayNames } from '../../../../../hooks/masters/useUserDisplayNames.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import './Ledger.css'

export default function Ledger() {
  const [search,  setSearch]  = useState('')
  const [filters, setFilters] = useState(EMPTY_LEDGER_FILTERS)
  const [sort,    setSort]    = useState(DEFAULT_LEDGER_SORT)
  const [page,    setPage]    = useState(1)
  const [limit,   setLimit]   = useState(50)
  const [detail,  setDetail]  = useState(null)
  const [exporting, setExporting] = useState(false)
  const displayName = useUserDisplayNames()

  // Debounce the free-text fields before they hit the query key, so typing
  // doesn't fire a request per keystroke — select/date fields already only
  // change on discrete user actions, but debouncing the whole object keeps
  // this one simple rule instead of splitting text vs. non-text filters.
  const debouncedFilters = useDebouncedValue({ ...filters, search }, 300)
  useEffect(() => { setPage(1) }, [debouncedFilters])

  const ledgerQuery = useLedger({ page, limit, ...debouncedFilters })
  const rows    = ledgerQuery.data?.rows ?? []
  const total   = ledgerQuery.data?.total ?? 0
  const loading = ledgerQuery.isLoading

  const openDetail = async (entry) => {
    setDetail({ entry, detail: null, loading: true })
    try {
      const res = await ledgerApi.entryDetail(entry.id)
      setDetail({ entry: res.data, detail: res.data.detail, loading: false })
    } catch (e) {
      setDetail({ entry, detail: null, loading: false, error: e.message })
    }
  }

  // The ledger's backend always paginates (no opt-in "give me everything"
  // mode like product-master/equipment-master — see ledger.controller.js,
  // `page`/`limit` default to 1/50 and skip/take are applied unconditionally)
  // and has no clampInt ceiling on `limit`, so export fetches with a very
  // large limit instead, matching the current filters but not the current page.
  async function exportLedgerCsv() {
    setExporting(true)
    try {
      const r = await ledgerApi.all({ ...debouncedFilters, page: 1, limit: 100000 })
      const all = r.data || []
      if (!all.length) { alert('No transactions to export — adjust your filters.'); return }
      const headers = ['Date & Time', 'Item Name', 'Transaction Type', 'Qty', 'Reference', 'Created By', 'Updated By']
      const csvRows = all.map(row => {
        const isIn  = row.inQty  > 0
        const isOut = row.outQty > 0
        const invQty = isIn ? row.inQty : row.outQty
        const showOperational = row.operationalUom && Number(row.operationalQty) !== Number(invQty)
        const sign = isIn ? '+' : isOut ? '-' : ''
        const qty = !isIn && !isOut
          ? ''
          : showOperational
            ? `${sign}${Number(row.operationalQty).toFixed(3)} ${row.operationalUom?.toUpperCase() || ''}`
            : `${sign}${Number(invQty).toFixed(3)} ${(row.uom || '').toUpperCase()}`
        return [
          new Date(row.timestamp).toLocaleString('en-IN'),
          toTitleCase(row.itemName) || row.itemCode,
          row.transactionType.replace(/_/g, ' '),
          qty,
          row.reference || '',
          row.createdBy ? toTitleCase(displayName(row.createdBy)) : '',
          row.updatedBy ? toTitleCase(displayName(row.updatedBy)) : '',
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      })
      const csv = [headers.join(','), ...csvRows].join('\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      a.download = `stock_ledger_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      alert(e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={ScrollText}
        title="Stock Ledger"
        description="Full transaction history — click any row for complete detail"
        actions={<>
          <Button onClick={() => ledgerQuery.refetch()} variant="outline-gray" size="sm" icon={RefreshCw}>Refresh</Button>
          <BackButton />
        </>}
      />

      <div className="p-6">
      <LedgerTable
        loading={loading} rows={rows} onOpenDetail={openDetail}
        search={search} onSearchChange={setSearch}
        filters={filters} onFiltersChange={setFilters}
        sort={sort} onSortChange={setSort}
        onExport={exportLedgerCsv} exporting={exporting}
        resultCount={total}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {total} transaction{total !== 1 ? 's' : ''} found · Page {page} of {Math.max(1, Math.ceil(total / limit))}
        </span>
        <Pagination
          page={page}
          total={total}
          limit={limit}
          onChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      </div>

      <TransactionDetailModal detail={detail} onClose={() => setDetail(null)} />
      </div>
    </div>
  )
}
