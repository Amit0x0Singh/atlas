import { useState, useEffect } from 'react'
import { ledgerApi } from '../../../../../api/inventory.js'
import { BackButton, Button, PageHeader } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import LedgerTable             from '../components/ledger-table/LedgerTable.jsx'
import LedgerFilters           from '../components/ledger-filters/LedgerFilters.jsx'
import TransactionDetailModal  from '../components/transaction-detail-modal/TransactionDetailModal.jsx'
import { RefreshCw, ScrollText } from 'lucide-react'
import { useLedger } from '../../../../../hooks/inventory/useLedger.js'
import { useDebouncedValue } from '../../../../../hooks/useDebouncedValue.js'
import './Ledger.css'

const BLANK_FILTERS = { search: '', transactionType: '', fromDate: '', toDate: '', warehouse: '', reference: '', direction: '' }

export default function Ledger() {
  const [filters, setFilters] = useState(BLANK_FILTERS)
  const [page,    setPage]    = useState(1)
  const [limit,   setLimit]   = useState(50)
  const [detail,  setDetail]  = useState(null)

  // Debounce the free-text fields before they hit the query key, so typing
  // doesn't fire a request per keystroke — select/date fields already only
  // change on discrete user actions, but debouncing the whole object keeps
  // this one simple rule instead of splitting text vs. non-text filters.
  const debouncedFilters = useDebouncedValue(filters, 300)
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

  const setFilter    = (key, value) => setFilters(f => ({ ...f, [key]: value }))
  const clearFilters  = () => setFilters(BLANK_FILTERS)

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
      <LedgerFilters
        values={filters}
        resultCount={total}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <LedgerTable loading={loading} rows={rows} onOpenDetail={openDetail} />

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
