import { useState, useEffect, useRef } from 'react'
import { outwardApi } from '../../../../../api/inventory.js'
import { BackButton, Button, PageHeader } from '../../../../../components/ui'
import WarehouseToWarehouse   from '../components/warehouse-to-warehouse/WarehouseToWarehouse.jsx'
import WarehouseToContainer   from '../components/warehouse-to-container/WarehouseToContainer.jsx'
import MaterialIssueByBOM     from '../components/material-issue-by-bom/page/MaterialIssueByBOM.jsx'
import BomIssuedHistory       from '../components/material-issue-by-bom/BomIssuedHistory.jsx'
import StockLossAdjustment    from '../components/stock-loss-adjustment/StockLossAdjustment.jsx'
import IndentIssue            from '../components/material-indent-issue/IndentIssue.jsx'
import { RefreshCw, Warehouse, ClipboardList, Container, TriangleAlert, History, ArrowUpFromLine, Inbox } from 'lucide-react'
import './Outward.css'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { humanQty } from '../../../../../utils/qty.js'
import { useUserDisplayNames } from '../../../../../hooks/masters/useUserDisplayNames.js'

const MODES = [
  {
    key:   'bom-issue',
    icon:  <ClipboardList size={22} />,
    label: 'Material Issue by BOM',
    desc:  'Issue raw materials to plant based on product recipe',
    accent: { border: 'border-indigo-200', hover: 'hover:border-indigo-400 hover:bg-indigo-50/60', icon: 'bg-indigo-100 text-indigo-600' },
  },
  {
    key:   'wh-wh',
    icon:  <Warehouse size={22} />,
    label: 'Warehouse Transfer',
    desc:  'Move a pack from one warehouse or location to another',
    accent: { border: 'border-blue-200', hover: 'hover:border-blue-400 hover:bg-blue-50/60', icon: 'bg-blue-100 text-blue-600' },
  },
  {
    key:   'wh-cont',
    icon:  <Container size={22} />,
    label: 'Warehouse to Container',
    desc:  'Fill a container from warehouse packs — scan bag QR',
    accent: { border: 'border-orange-200', hover: 'hover:border-orange-400 hover:bg-orange-50/60', icon: 'bg-orange-100 text-orange-600' },
  },
  {
    key:   'stock-loss',
    icon:  <TriangleAlert size={22} />,
    label: 'Stock Loss Adjustment',
    desc:  'Record material lost due to spillage, damage or weighing error',
    accent: { border: 'border-red-200', hover: 'hover:border-red-400 hover:bg-red-50/60', icon: 'bg-red-100 text-red-600' },
  },
  {
    key:   'indent-issue',
    icon:  <Inbox size={22} />,
    label: 'Open Indents',
    desc:  'Issue general store items requested by plant sections — scan QR',
    accent: { border: 'border-teal-200', hover: 'hover:border-teal-400 hover:bg-teal-50/60', icon: 'bg-teal-100 text-teal-600' },
  },
]

const MODE_MAP = Object.fromEntries(MODES.map(m => [m.key, m]))

function fmt(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const TYPE_COLOR = {
  BOM_ISSUANCE:       'bg-indigo-100 text-indigo-700',
  DIRECT_ISSUE:       'bg-blue-100 text-blue-700',
  PACK_REDUCTION:     'bg-orange-100 text-orange-700',
  CONTAINER_ISSUE:    'bg-green-100 text-green-700',
  WAREHOUSE_TRANSFER: 'bg-gray-100 text-gray-700',
  STOCK_ADJUSTMENT:   'bg-red-100 text-red-700',
  MATERIAL_INDENT:    'bg-teal-100 text-teal-700',
}

function Panel({ mode, onBack, actions, children }) {
  const m = MODE_MAP[mode]
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 bg-white flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`p-2 rounded-xl ${m?.accent?.icon || 'bg-gray-100 text-gray-600'}`}>{m?.icon}</span>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-gray-900 truncate">{m?.label}</h1>
            {/* Hidden on mobile — same reasoning as the Inward page: the
                one-line explainer isn't worth the vertical space there */}
            <p className="hidden md:block text-xs text-gray-500 truncate">{m?.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          {/* Single "Back" for the whole panel — one step back: out of the
              BOM checklist / BOM Issued view / Open Indents sub-flow first,
              otherwise out to the Outward mode selection. */}
          <BackButton onClick={onBack} size="sm" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

export default function Outward() {
  const displayName = useUserDisplayNames()
  const [mode,      setMode]      = useState(null)
  const [bomView,   setBomView]   = useState('select') // 'select' | 'history' — bom-issue mode only
  const [resumeId,  setResumeId]  = useState(null)
  const [history,   setHistory]   = useState([])
  const [histPage,  setHistPage]  = useState(1)
  const [histTotal, setHistTotal] = useState(0)
  const indentIssueRef            = useRef(null)
  const bomIssueRef               = useRef(null)
  const LIMIT = 15

  useEffect(() => { loadHistory() }, [histPage])

  const loadHistory = async () => {
    try {
      const r = await outwardApi.history({ page: histPage, limit: LIMIT })
      setHistory(r.data || [])
      setHistTotal(r.total || 0)
    } catch { /* silent */ }
  }

  const goBack = () => { setMode(null); setBomView('select'); loadHistory() }

  if (mode) {
    // On the BOM Issued history view the single "Back" button returns to the
    // BOM Issue picker (not all the way out to Outward); elsewhere it's the
    // page-level "Back to Outward".
    const isBomHistory = mode === 'bom-issue' && bomView === 'history'

    const bomActions = mode === 'bom-issue' && !isBomHistory && (
      <Button onClick={() => setBomView('history')} variant="purple" size="sm" icon={History}>
        BOM Issued
      </Button>
    )

    // Open Indents / Material Issue by BOM each own an internal list ↔ checklist
    // flow; give the header Back button first crack at stepping back inside that
    // flow, and only fall through to leaving the Outward mode once it's back at
    // the list / picker.
    const indentBack = () => { if (!indentIssueRef.current?.handleBack()) goBack() }
    const bomBack    = () => { if (!bomIssueRef.current?.handleBack())   goBack() }

    return (
      <Panel
        mode={mode}
        onBack={
          mode === 'indent-issue' ? indentBack
          : isBomHistory          ? () => setBomView('select')
          : mode === 'bom-issue'  ? bomBack
          : goBack
        }
        actions={bomActions}
      >{
        mode === 'bom-issue' ? (
          bomView === 'history'
            ? <BomIssuedHistory />
            : <MaterialIssueByBOM ref={bomIssueRef} resumeSessionId={resumeId} onAutoResumed={() => setResumeId(null)} />
        ) :
        mode === 'wh-wh'        ? <WarehouseToWarehouse /> :
        mode === 'wh-cont'      ? <WarehouseToContainer /> :
        mode === 'stock-loss'   ? <StockLossAdjustment /> :
        mode === 'indent-issue' ? <IndentIssue ref={indentIssueRef} /> : null
      }</Panel>
    )
  }

  const totalPages = Math.ceil(histTotal / LIMIT)

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        icon={ArrowUpFromLine}
        title="Store Outward"
        description="Issue materials, transfer stock, and record adjustments"
        actions={<span className="hidden md:block"><BackButton size="sm" /></span>}
      />

      <div className="p-4 md:p-6">
        {/* Outward action cards */}
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Outward Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3 mb-7">
          {MODES.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`bg-white border-2 ${m.accent.border} ${m.accent.hover} rounded-xl p-3 md:p-4 text-left transition-all group`}>
              <span className={`inline-flex p-2 rounded-lg mb-3 ${m.accent.icon} transition-colors`}>
                {m.icon}
              </span>
              <div className="font-bold text-gray-900 text-sm mb-1 leading-snug">{m.label}</div>
              {/* Card stays icon + title only on mobile — the blurb is nice-to-have
                  desktop context, not worth the extra card height on small screens */}
              <div className="hidden md:block text-xs text-gray-400 leading-relaxed">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Recent transactions */}
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Recent Transactions</h2>
            <Button onClick={loadHistory} variant="outline-gray" size="sm" icon={RefreshCw}>Refresh</Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Date &amp; Time</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">RM Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Source</th>
                  <th className="text-right px-4 py-3 font-semibold">Qty Issued</th>
                  <th className="text-left px-4 py-3 font-semibold">Remarks</th>
                  <th className="text-left px-4 py-3 font-semibold">Created By</th>
                  <th className="text-left px-4 py-3 font-semibold">Updated By</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <div className="text-2xl mb-2">📋</div>
                      <div className="text-sm font-medium text-gray-500">No transactions yet</div>
                    </td>
                  </tr>
                ) : history.map((h, i) => (
                  <tr key={h.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(h.timestamp)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLOR[h.sourceType] || 'bg-gray-100 text-gray-600'}`}>
                        {h.sourceType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-800 font-medium">{toTitleCase(h.rmName) || h.rmCode}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 max-w-[150px] truncate">{h.sourceId}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-600 whitespace-nowrap">
                      {/* Main figure is what the operator entered (Operational
                          UOM); the sub-line is what actually left inventory,
                          so it carries the Inventory UOM — without the unit,
                          "12.000 L (18.000 deducted)" reads as nonsense. */}
                      {humanQty(h.operationalQty ?? h.qtyIssued, h.operationalUom || h.inventoryUom)}
                      {h.operationalUom && Number(h.operationalQty) !== Number(h.qtyIssued) && (
                        <div className="text-[10px] font-normal text-gray-400">
                          ({humanQty(h.qtyIssued, h.inventoryUom)} deducted)
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 max-w-[130px] truncate">{h.remarks || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{displayName(h.createdBy)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{displayName(h.updatedBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button disabled={histPage <= 1} onClick={() => setHistPage(p => p - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
                Prev
              </button>
              <span className="text-sm text-gray-500 px-2">Page {histPage} / {totalPages}</span>
              <button disabled={histPage >= totalPages} onClick={() => setHistPage(p => p + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
