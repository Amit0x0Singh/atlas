import { useState, useEffect, useMemo, Fragment } from 'react'
import { outwardApi } from '../../../../../../api/inventory.js'
import { Button, BackButton } from '../../../../../../components/ui'
import { ChevronDown, ChevronRight } from 'lucide-react'

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Outward remarks for BOM issuance are written as:
// "BOM: {productName} | Batch: {batchSize} kg | Ref: {batchRef}"
function parseRemarks(remarks) {
  const m = /^BOM:\s*(.*?)(?:\s*\|\s*Batch:\s*([\d.]+)\s*kg)?(?:\s*\|\s*Ref:\s*(.*))?$/.exec(remarks || '')
  return {
    productName: m?.[1]?.trim() || 'Unknown product',
    batchSize:   m?.[2] || '',
    batchRef:    m?.[3]?.trim() || '',
  }
}

export default function BomIssuedHistory({ sessions, onResume, onRemove, onBack }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setLoading(true)
    outwardApi.history({ limit: 300 })
      .then(r => setRows((r.data || []).filter(row => row.sourceType === 'BOM_ISSUANCE')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group individual issuance lines back into their BOM batch
  const batches = useMemo(() => {
    const map = new Map()
    for (const row of rows) {
      const { productName, batchSize, batchRef } = parseRemarks(row.remarks)
      const key = `${productName}__${batchRef}`
      if (!map.has(key)) {
        map.set(key, { key, productName, batchSize, batchRef, lines: [], lastTs: row.timestamp })
      }
      const b = map.get(key)
      b.lines.push(row)
      if (new Date(row.timestamp) > new Date(b.lastTs)) b.lastTs = row.timestamp
    }
    return [...map.values()].sort((a, b) => new Date(b.lastTs) - new Date(a.lastTs))
  }, [rows])

  const activeSessions = sessions.filter(s => s.bomLines?.some(l => l.issued < l.required - 0.001))

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">BOM Issued</h2>
          <p className="text-sm text-gray-500 mt-0.5">Issued BOM history and in-progress issuance sessions</p>
        </div>
        <BackButton onClick={onBack} label="Back" size="sm" />
      </div>

      {/* ── In-Progress BOMs ── */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          In-Progress BOMs
          {activeSessions.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {activeSessions.length}
            </span>
          )}
        </h3>

        {activeSessions.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center text-sm text-gray-400">
            No BOM sessions in progress
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-amber-800 text-xs">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Product</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Batch</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Progress</th>
                  <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">Last updated</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {activeSessions.map(s => {
                  const done  = s.bomLines?.filter(l => l.issued >= l.required - 0.001).length || 0
                  const total = s.bomLines?.length || 0
                  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <tr key={s.id} className="border-t border-amber-100 hover:bg-amber-50/50">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-900">{s.productName}</div>
                        <div className="text-xs text-gray-400 font-mono">{s.productCode}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{s.batchQty} KG</span>
                        {s.batchRef && <div className="text-xs text-gray-400 font-mono">{s.batchRef}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">{done}/{total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">
                        {s.updatedAt ? fmtDate(s.updatedAt) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Button onClick={() => onResume(s)} variant="purple" size="xs" className="mr-1.5">
                          Resume →
                        </Button>
                        <Button onClick={() => onRemove(s.id)} variant="danger" size="xs">
                          Delete
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Issued BOM History ── */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Issued BOM History</h3>

        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading history...</p>
        ) : batches.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center text-sm text-gray-400">
            No BOM issuances recorded yet
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white text-xs">
                <tr>
                  <th className="px-4 py-2.5 w-8" />
                  <th className="text-left px-4 py-2.5 font-semibold">Product</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Batch Ref</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Materials</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Last Issued</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const isOpen   = expanded === b.key
                  const totalQty = b.lines.reduce((s, l) => s + Number(l.qtyIssued || 0), 0)
                  return (
                    <Fragment key={b.key}>
                      <tr
                        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : b.key)}>
                        <td className="px-4 py-2.5 text-gray-400">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-gray-900">{b.productName}</span>
                          {b.batchSize && <span className="text-xs text-gray-400 font-normal ml-1">· {b.batchSize} KG</span>}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{b.batchRef || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {b.lines.length} item{b.lines.length !== 1 ? 's' : ''} · {totalQty.toFixed(2)} kg
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(b.lastTs)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gray-50/60">
                          <td colSpan={5} className="px-4 py-3">
                            <table className="w-full text-xs">
                              <thead className="text-gray-400">
                                <tr>
                                  <th className="text-left font-medium pb-1">RM</th>
                                  <th className="text-left font-medium pb-1">Source</th>
                                  <th className="text-right font-medium pb-1">Qty</th>
                                  <th className="text-left font-medium pb-1 pl-4">Time</th>
                                </tr>
                              </thead>
                              <tbody>
                                {b.lines.map(l => (
                                  <tr key={l.id} className="border-t border-gray-200">
                                    <td className="py-1 text-gray-700">{l.rmName || l.rmCode}</td>
                                    <td className="py-1 font-mono text-gray-400">{l.sourceId}</td>
                                    <td className="py-1 text-right font-semibold text-red-600">{Number(l.qtyIssued).toFixed(3)}</td>
                                    <td className="py-1 text-gray-400 pl-4">{fmtDate(l.timestamp)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
