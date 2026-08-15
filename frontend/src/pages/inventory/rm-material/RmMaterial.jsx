import './RmMaterial.css'
import { useState, useEffect, useMemo } from 'react'
import { stockApi } from '../../../api/inventory.js'
import { BackButton, IconButton, PageHeader } from '../../../components/ui'
import { RefreshCw, PackageSearch } from 'lucide-react'
import RmStatsBar    from './components/rm-stats-bar/RmStatsBar.jsx'
import RmTable       from './components/rm-table/RmTable.jsx'
import { EMPTY_RM_FILTERS } from './components/rm-table/RmToolbar.jsx'
import { DEFAULT_RM_SORT } from './components/rm-table/RmSortModal.jsx'

export default function RmMaterial() {
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [search,      setSearch]      = useState('')
  const [filters,     setFilters]     = useState(EMPTY_RM_FILTERS)
  const [sort,        setSort]        = useState(DEFAULT_RM_SORT)
  const [page,        setPage]        = useState(1)
  const [limit,       setLimit]       = useState(15)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await stockApi.summary()
      setItems(r.data || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const uomOptions = useMemo(() => [...new Set(items.map(it => it.uom).filter(Boolean))].sort(), [items])

  const filtered = useMemo(() => {
    let list = items.filter(it => {
      if (search) {
        const q = search.toLowerCase()
        if (!it.itemName?.toLowerCase().includes(q) && !it.itemCode?.toLowerCase().includes(q)) return false
      }
      if (filters.status === 'in_stock'     && it.totalStock <= 0) return false
      if (filters.status === 'out_of_stock' && it.totalStock  > 0) return false
      if (filters.uom && it.uom !== filters.uom) return false
      if (filters.minQty !== '' && it.totalStock < Number(filters.minQty)) return false
      if (filters.maxQty !== '' && it.totalStock > Number(filters.maxQty)) return false
      return true
    })

    const dir = sort.direction === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      if (sort.field === 'totalQty') return dir * ((a.totalStock || 0) - (b.totalStock || 0))
      if (sort.field === 'itemCode') return dir * (a.itemCode || '').localeCompare(b.itemCode || '')
      return dir * (a.itemName || '').localeCompare(b.itemName || '') // 'name'
    })

    return list
  }, [items, search, filters, sort])

  const paginated = filtered.slice((page - 1) * limit, page * limit)

  const handleSearch = (v) => { setSearch(v); setPage(1) }
  const handleFilters = (f) => { setFilters(f); setPage(1) }

  function exportRmCsv() {
    if (!filtered.length) { alert('No items to export — adjust your filters.'); return }
    const headers = ['Item Code', 'Item Name', 'UOM', 'In Pack', 'In Container', 'Total Qty', 'Status']
    const rows = filtered.map(it => [
      it.itemCode, it.itemName, it.uom || '',
      it.stockInPacks ?? 0, it.stockInContainer ?? 0, it.totalStock ?? 0,
      (it.totalStock || 0) > 0 ? 'In Stock' : 'Out of Stock',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `raw_materials_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        icon={PackageSearch}
        title="Raw Materials"
        description={`Stock overview · ${items.length} items registered`}
        actions={<>
          <IconButton icon={RefreshCw} tooltip="Refresh" onClick={load} />
          <BackButton />
        </>}
      />

      <div className="px-6 py-7">
        {!loading && <RmStatsBar items={items} />}

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>
        )}

        <RmTable
          loading={loading}
          items={items}
          filtered={filtered}
          paginated={paginated}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
          search={search}
          onSearchChange={handleSearch}
          filters={filters}
          onFiltersChange={handleFilters}
          sort={sort}
          onSortChange={setSort}
          uomOptions={uomOptions}
          onExport={exportRmCsv}
        />
      </div>
    </div>
  )
}
