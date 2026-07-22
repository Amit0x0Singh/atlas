import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { stockStatusBadgeCls, fmtDate } from '../../../transaction/utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import { useReactivateContainer } from '../../../../../hooks/microbial/useMicrobialStorage.js'

export default function ContainerLedgerTable({ rows, filterSeed }) {
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const sectionRef = useRef(null)
  const reactivate = useReactivateContainer()

  useEffect(() => {
    if (!filterSeed) return
    setSearch(filterSeed.microbeCode || '')
    setTypeFilter(filterSeed.microbeType || '')
    setExpanded(true)
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filterSeed])

  const types = useMemo(() => [...new Set(rows.map((r) => r.microbe_type))], [rows])
  const statuses = ['Fresh', 'Moderate', 'Near Expiry', 'Expired', 'Exhausted', 'Inactive']

  const filtered = useMemo(() => rows.filter((r) => {
    if (typeFilter && r.microbe_type !== typeFilter) return false
    if (statusFilter === 'Inactive' && !r.inactive) return false
    if (statusFilter && statusFilter !== 'Inactive' && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.microbe_name.toLowerCase().includes(q) && !r.microbe_code.toLowerCase().includes(q) && !r.container_code.toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, search, typeFilter, statusFilter])

  const handleExport = () => exportCsv('container_ledger.csv', filtered, [
    { label: 'Container', value: (r) => r.container_code },
    { label: 'Microbe', value: (r) => r.microbe_name },
    { label: 'Type', value: (r) => r.microbe_type },
    { label: 'Location', value: (r) => (r.inactive ? r.inactive_location : r.location) },
    { label: 'Batches', value: (r) => r.batch_count },
    { label: 'Balance (kg)', value: (r) => r.balance_kg.toFixed(4) },
    { label: 'Total In', value: (r) => r.total_in_kg.toFixed(3) },
    { label: 'Total Out', value: (r) => r.total_out_kg.toFixed(3) },
    { label: 'Next Expiry', value: (r) => r.next_expiry ? fmtDate(r.next_expiry) : '' },
    { label: 'Status', value: (r) => (r.inactive ? 'Inactive' : r.status) },
  ])

  const handleReactivate = async (r) => {
    if (!confirm(`Reactivate ${r.container_code}? You'll need to assign it a new storage slot via a new inward entry.`)) return
    try { await reactivate.mutateAsync(r.container_id) } catch (err) { alert(err.message) }
  }

  return (
    <div ref={sectionRef} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" className="w-full px-4 py-2.5 bg-gray-800 text-white flex items-center justify-between" onClick={() => setExpanded((e) => !e)}>
        <span className="text-xs font-bold">🗃️ Container Ledger</span>
        <span className="flex items-center gap-2 text-xs">
          <span className="opacity-80">{rows.length} containers</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div>
          <div className="p-3 flex flex-wrap gap-2 border-b border-gray-100">
            <input className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 w-[200px]" placeholder="Search container, microbe..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button variant="outline-gray" size="sm" icon={Download} onClick={handleExport} className="ml-auto">Export</Button>
          </div>

          {!filtered.length ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-3xl mb-2">🗃️</div>
              <p className="text-sm">No containers match.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>{['Container', 'Microbe', 'Type', 'Location', 'Batches', 'Balance (kg)', 'Total In', 'Total Out', 'Next Expiry', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide bg-gray-50 border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.container_id} className={`border-b border-gray-100 ${r.inactive ? 'bg-gray-50/70' : ''}`}>
                      <td className="px-3 py-2 font-mono text-gray-700">
                        {r.container_code}
                        {r.inactive && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-[9px] font-bold align-middle">⏸ INACTIVE</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-800">{r.microbe_name}</td>
                      <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">{r.microbe_type}</span></td>
                      <td className="px-3 py-2 text-gray-500">{r.inactive ? `${r.inactive_location || '—'} (freed)` : (r.location || '—')}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{r.batch_count}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{r.balance_kg.toFixed(4)}</td>
                      <td className="px-3 py-2 text-gray-700">{r.total_in_kg.toFixed(3)}</td>
                      <td className="px-3 py-2 text-gray-700">{r.total_out_kg.toFixed(3)}</td>
                      <td className="px-3 py-2 text-gray-600">{fmtDate(r.next_expiry)}</td>
                      <td className="px-3 py-2"><span className={stockStatusBadgeCls(r.status)}>{r.status}</span></td>
                      <td className="px-3 py-2">
                        {r.inactive && (
                          <Button variant="outline-gray" size="xs" icon={PlayCircle} disabled={reactivate.isPending} onClick={() => handleReactivate(r)}>Reactivate</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
