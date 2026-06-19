import { useState, useEffect, useCallback } from 'react'
import { stockApi } from '../../../../../api/inventory.js'
import BackButton from '../../../../../components/erp/BackButton.jsx'

const PERIODS = [
  { key: 'today', label: 'Today'      },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year'  },
  { key: 'all',   label: 'All Time'   },
]

function fmt(n, dec = 0) {
  if (n == null || n === undefined) return '—'
  const v = Number(n)
  if (isNaN(v)) return '—'
  return dec > 0
    ? v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    : v.toLocaleString('en-IN')
}

// ── Individual stat card ──────────────────────────────────────────────────────
function Card({ dot, label, value, sub, subColor = 'text-gray-400', loading }) {
  const dotColors = {
    blue:   'bg-blue-500',
    green:  'bg-emerald-500',
    red:    'bg-red-400',
    amber:  'bg-amber-400',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    teal:   'bg-teal-500',
    gray:   'bg-gray-400',
    orange: 'bg-orange-400',
    sky:    'bg-sky-500',
    rose:   'bg-rose-500',
    lime:   'bg-lime-500',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {dot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[dot] ?? 'bg-gray-400'}`} />}
        <span className="text-xs font-medium text-gray-400 tracking-wide">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <>
          <span className="text-3xl font-bold text-gray-900 leading-none">{value}</span>
          {sub && <span className={`text-xs leading-snug ${subColor}`}>{sub}</span>}
        </>
      )}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, cols = 4, children }) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }[cols] || 'grid-cols-2 sm:grid-cols-4'

  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 pl-1">
        {title}
      </p>
      <div className={`grid ${colClass} gap-4`}>
        {children}
      </div>
    </div>
  )
}

export default function Stock() {
  const [period,  setPeriod]  = useState('today')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [ts,      setTs]      = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await stockApi.dashboard(period)
      setData(r.data)
      setTs(new Date())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  const d  = data || {}
  const rm   = d.rawMaterials || {}
  const gate = d.gate         || {}
  const st   = d.store        || {}
  const prod = d.production   || {}
  const so   = d.salesOrders  || {}
  const dis  = d.dispatch     || {}

  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-7">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ERP Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              SOM Phytopharma · operational overview
              {ts && <> · updated {ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition"
              title="Refresh"
            >
              ↻
            </button>
            <BackButton />
          </div>
        </div>

        {/* ── Period selector ───────────────────────────────────────────── */}
        <div className="flex gap-1 mb-8 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                period === p.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* ── Dashboard grid ────────────────────────────────────────────── */}
        <div className="space-y-7">

          {/* Raw Materials — snapshot, no period filter */}
          <Section title="Raw Materials" cols={3}>
            <Card dot="indigo" label="Total RM Items"
              value={fmt(rm.totalItems)}
              sub="registered in system"
              loading={loading} />
            <Card dot="green" label="Items in Stock"
              value={fmt(rm.inStock)}
              sub="have available quantity"
              subColor="text-emerald-600"
              loading={loading} />
            <Card dot="red" label="Out of Stock"
              value={fmt(rm.outOfStock)}
              sub="need replenishment"
              subColor="text-red-500"
              loading={loading} />
          </Section>

          {/* Gate */}
          <Section title={`Gate  ·  ${periodLabel}`} cols={4}>
            <Card dot="orange" label="Gate Inward"
              value={fmt(gate.inwardTotal)}
              sub={gate.inwardPending ? `${fmt(gate.inwardPending)} pending approval` : undefined}
              subColor="text-amber-500"
              loading={loading} />
            <Card dot="lime" label="Inward Approved"
              value={fmt(gate.inwardApproved)}
              sub="cleared at gate"
              subColor="text-emerald-600"
              loading={loading} />
            <Card dot="amber" label="Inward Pending"
              value={fmt(gate.inwardPending)}
              sub="awaiting approval"
              subColor="text-amber-500"
              loading={loading} />
            <Card dot="sky" label="Gate Outward"
              value={fmt(gate.outwardTotal)}
              sub="outward movements"
              loading={loading} />
          </Section>

          {/* Store */}
          <Section title={`Store  ·  ${periodLabel}`} cols={5}>
            <Card dot="indigo" label="Packs Generated"
              value={fmt(st.packsGenerated)}
              sub="in print master"
              loading={loading} />
            <Card dot="green" label="Packs Inwarded"
              value={fmt(st.packsInwarded)}
              sub="received into stock"
              subColor="text-emerald-600"
              loading={loading} />
            <Card dot="amber" label="Awaiting Inward"
              value={fmt(st.packsAwaiting)}
              sub="not yet scanned"
              subColor="text-amber-500"
              loading={loading} />
            <Card dot="rose" label="Outward Txns"
              value={fmt(st.outwardTransactions)}
              sub="issues from store"
              loading={loading} />
            <Card dot="violet" label="Qty Issued"
              value={fmt(st.totalQtyIssued, 2)}
              sub="kg total issued"
              loading={loading} />
          </Section>

          {/* Production */}
          <Section title={`Production  ·  ${periodLabel}`} cols={6}>
            <Card dot="blue" label="Total Indents"
              value={fmt(prod.totalIndents)}
              loading={loading} />
            <Card dot="amber" label="Open Indents"
              value={fmt(prod.openIndents)}
              subColor="text-amber-500"
              loading={loading} />
            <Card dot="gray" label="Closed Indents"
              value={fmt(prod.closedIndents)}
              loading={loading} />
            <Card dot="teal" label="Batches Created"
              value={fmt(prod.totalBatches)}
              loading={loading} />
            <Card dot="sky" label="In Progress"
              value={fmt(prod.inProgressBatches)}
              subColor="text-blue-600"
              loading={loading} />
            <Card dot="green" label="Completed"
              value={fmt(prod.completedBatches)}
              subColor="text-emerald-600"
              loading={loading} />
          </Section>

          {/* Sales & Dispatch */}
          <Section title={`Sales & Dispatch  ·  ${periodLabel}`} cols={4}>
            <Card dot="violet" label="Sales Orders"
              value={fmt(so.total)}
              sub="new orders received"
              loading={loading} />
            <Card dot="amber" label="Pending Items"
              value={fmt(so.pendingItems)}
              sub="yet to dispatch"
              subColor="text-amber-500"
              loading={loading} />
            <Card dot="green" label="Dispatched Items"
              value={fmt(so.dispatchedItems)}
              sub="fulfilled"
              subColor="text-emerald-600"
              loading={loading} />
            <Card dot="teal" label="Dispatches"
              value={fmt(dis.total)}
              sub="shipments created"
              loading={loading} />
          </Section>

        </div>

        {/* Footer note */}
        <p className="text-[11px] text-gray-400 mt-8 pl-1">
          ※ Raw Materials stock count reflects current state. All other metrics filtered by <strong>{periodLabel}</strong>.
        </p>

      </div>
    </div>
  )
}
