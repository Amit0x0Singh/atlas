import { useState, useMemo } from 'react'
import './GRN.css'
import { grnApi } from '../../../../../api/inventory.js'
import { ErrorModal } from '../../../../../components/ui'
import GrnList   from '../components/grn-list/GrnList.jsx'
import GrnDetail from '../components/grn-detail/GrnDetail.jsx'
import GrnFilterModal, { EMPTY_GRN_FILTERS, countActiveGrnFilters, applyGrnFilters } from '../components/grn-filter/GrnFilterModal.jsx'
import { useGrnList } from '../../../../../hooks/inventory/useGrn.js'

export default function GRN() {
  const [search,        setSearch]        = useState('')
  const [filters,       setFilters]       = useState(EMPTY_GRN_FILTERS)
  const [filterOpen,    setFilterOpen]    = useState(false)
  const [selected,      setSelected]      = useState(null)
  const [detail,        setDetail]        = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [errModal, setErrModal] = useState({ open: false, message: '' })

  const { data: list = [], isLoading: loading } = useGrnList()

  // Distinct suppliers / companies present in the data — drive the filter
  // form's dropdowns so it only ever offers values that can actually match.
  const supplierOptions = useMemo(
    () => [...new Set(list.map(g => g.supplier).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [list],
  )
  const companyOptions = useMemo(
    () => [...new Set(list.map(g => g.company).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [list],
  )

  const activeFilterCount = countActiveGrnFilters(filters)

  const filteredGrns = useMemo(() => {
    let rows = applyGrnFilters(list, filters)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(grn =>
        (grn.invoiceNo || '').toLowerCase().includes(q) ||
        (grn.supplier || '').toLowerCase().includes(q) ||
        (grn.items || []).some(i => i.toLowerCase().includes(q)),
      )
    }
    return rows
  }, [list, filters, search])

  const loadDetail = async (grn) => {
    setSelected(grn); setDetail(null); setLoadingDetail(true)
    try {
      const res = await grnApi.detail(grn.gateInwardId)
      setDetail(res.data)
    } catch (e) { setErrModal({ open: true, message: 'Failed to load GRN: ' + e.message }) }
    setLoadingDetail(false)
  }

  return (
    <div className="flex flex-col h-full grn-layout">
      <div className="flex flex-1 min-h-0">
        <GrnList
          list={filteredGrns}
          totalCount={list.length}
          loading={loading}
          search={search}
          filters={filters}
          activeFilterCount={activeFilterCount}
          onSearch={setSearch}
          onOpenFilter={() => setFilterOpen(true)}
          onChangeFilters={setFilters}
          selected={selected}
          onSelect={loadDetail}
        />
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <GrnDetail
            selected={selected}
            detail={detail}
            loading={loadingDetail}
          />
        </div>
      </div>

      <GrnFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={setFilters}
        suppliers={supplierOptions}
        companies={companyOptions}
      />

      <ErrorModal
        open={errModal.open}
        message={errModal.message}
        onClose={() => setErrModal({ open: false, message: '' })}
      />
    </div>
  )
}
