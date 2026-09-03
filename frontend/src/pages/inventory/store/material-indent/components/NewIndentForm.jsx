import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Loader2 } from 'lucide-react'
import { Button, ConfirmModal } from '../../../../../components/ui'
import { rmApi, materialIndentApi } from '../../../../../api/inventory.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

const PRIORITIES = ['Normal', 'Urgent', 'Critical']
const LABEL_CLS  = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5'
const FIELD_CLS  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors'

let ROW_SEQ = 0
const blankRow = () => ({ rowId: `r${++ROW_SEQ}`, itemCode: '', itemName: '', uom: '', qty: '', remarks: '' })

// One item-name cell with a search-as-you-type dropdown over the Item Master.
// The results panel is rendered in a portal on <body> and positioned against
// the input in viewport coordinates — the row table has `overflow-x-auto`,
// which would otherwise clip an absolutely-positioned dropdown to a sliver.
function ItemCell({ row, allItems, takenCodes, onPick }) {
  const [q, setQ]       = useState(row.itemName || '')
  const [open, setOpen] = useState(false)
  const [hi, setHi]     = useState(0)
  const [rect, setRect] = useState(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => { setQ(row.itemName || '') }, [row.itemName])

  useEffect(() => {
    const onDown = (e) => {
      if (inputRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Track the input's on-screen position while the dropdown is open so it
  // follows page/section scrolling and window resizes.
  useEffect(() => {
    if (!open) return
    const measure = () => { if (inputRef.current) setRect(inputRef.current.getBoundingClientRect()) }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [open])

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    const pool = allItems.filter(i => !takenCodes.has(i.itemCode) || i.itemCode === row.itemCode)
    if (!t) return pool.slice(0, 12)
    return pool.filter(i => i.itemName.toLowerCase().includes(t) || i.itemCode.toLowerCase().includes(t)).slice(0, 30)
  }, [q, allItems, takenCodes, row.itemCode])

  const panel = open && rect && createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      style={{
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
        maxWidth: '90vw',
        maxHeight: Math.max(160, Math.min(288, window.innerHeight - rect.bottom - 16)),
      }}
    >
      {matches.length === 0 ? (
        <div className="px-3 py-3 text-xs text-gray-400 text-center">No matching item in the Item Master.</div>
      ) : matches.map((it, i) => (
        <button
          type="button"
          key={it.itemCode}
          onMouseDown={(e) => { e.preventDefault(); onPick(row.rowId, it); setOpen(false) }}
          className={`w-full text-left px-3 py-2 border-b border-gray-50 last:border-0 ${i === hi ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
        >
          <div className="text-[13px] font-semibold text-gray-900">{toTitleCase(it.itemName)}</div>
          <div className="text-[11px] text-gray-400 font-mono">{it.itemCode}{it.category ? ` · ${it.category}` : ''}</div>
        </button>
      ))}
    </div>,
    document.body,
  )

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={FIELD_CLS}
        placeholder="Search item name or code…"
        value={q}
        autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => (h + 1) % matches.length) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => (h - 1 + matches.length) % matches.length) }
          else if (e.key === 'Enter') { e.preventDefault(); onPick(row.rowId, matches[hi]); setOpen(false) }
          else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {panel}
    </div>
  )
}

export default function NewIndentForm({ editIndent, onSaved, onCancelEdit }) {
  const [allItems, setAllItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  useEffect(() => {
    rmApi.search()
      .then(r => setAllItems(r.data || []))
      .catch(() => setAllItems([]))
      .finally(() => setLoadingItems(false))
  }, [])

  const [priority, setPriority]             = useState('Normal')
  const [criticalReason, setCriticalReason] = useState('')
  const [overallRemarks, setOverallRemarks] = useState('')
  const [rows, setRows]                     = useState(() => Array.from({ length: 3 }, blankRow))

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  // Load an existing draft for editing
  useEffect(() => {
    if (!editIndent) return
    setPriority(editIndent.priority || 'Normal')
    setCriticalReason(editIndent.criticalReason || '')
    setOverallRemarks(editIndent.overallRemarks || '')
    const loaded = (editIndent.items || []).map(it => ({
      rowId: `r${++ROW_SEQ}`, itemCode: it.itemCode, itemName: it.itemName,
      uom: it.uom, qty: String(it.requestedQty ?? ''), remarks: it.remarks || '',
    }))
    while (loaded.length < 3) loaded.push(blankRow())
    setRows(loaded)
  }, [editIndent])

  const takenCodes = useMemo(() => new Set(rows.map(r => r.itemCode).filter(Boolean)), [rows])

  const pickItem = (rowId, item) => {
    if (!item) return
    setRows(rs => rs.map(r => r.rowId === rowId
      ? { ...r, itemCode: item.itemCode, itemName: item.itemName, uom: (item.operationalUom || item.inventoryUom || '').toUpperCase() }
      : r))
  }
  const patchRow  = (rowId, patch) => setRows(rs => rs.map(r => r.rowId === rowId ? { ...r, ...patch } : r))
  const removeRow  = (rowId) => setRows(rs => (rs.length > 1 ? rs.filter(r => r.rowId !== rowId) : rs))
  const addRow     = () => setRows(rs => [...rs, blankRow()])

  const filledRows = rows.filter(r => r.itemCode && r.qty !== '' && Number(r.qty) > 0)

  const validate = () => {
    if (priority === 'Critical' && !criticalReason.trim()) return 'Provide a reason for Critical priority.'
    if (filledRows.length === 0) return 'Add at least one item with a quantity.'
    for (const r of rows) {
      if (r.itemCode && (r.qty === '' || Number(r.qty) <= 0)) return `Enter a valid quantity for ${toTitleCase(r.itemName)}.`
      if (!r.itemCode && r.qty !== '' && Number(r.qty) > 0) return 'Select an item for every row that has a quantity.'
    }
    return ''
  }

  const buildPayload = (submit) => ({
    submit,
    priority,
    criticalReason,
    overallRemarks,
    items: filledRows.map(r => ({ itemCode: r.itemCode, requestedQty: Number(r.qty), remarks: r.remarks })),
  })

  const reset = () => {
    setPriority('Normal'); setCriticalReason(''); setOverallRemarks('')
    setRows(Array.from({ length: 3 }, blankRow))
  }

  const save = async (submit) => {
    setError('')
    if (submit) {
      const v = validate()
      if (v) { setError(v); return }
    } else if (filledRows.length === 0) {
      setError('Add at least one item before saving a draft.'); return
    }
    setBusy(true)
    try {
      const payload = buildPayload(submit)
      const res = editIndent
        ? await materialIndentApi.update(editIndent.id, payload)
        : await materialIndentApi.create(payload)
      setConfirmOpen(false)
      reset()
      onSaved?.(res.data, submit)
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Could not save the indent.')
      setConfirmOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      {editIndent && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
          <span className="text-sm text-amber-800 font-medium">Editing draft {editIndent.indentNo || ''}</span>
          <button className="text-xs font-semibold text-amber-700 hover:underline" onClick={onCancelEdit}>Cancel edit</button>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {/* Items — top card, fills the page width */}
      <section className="bg-white border border-gray-200 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Requested Materials</h2>
          <span className="text-xs text-gray-400">Unit fills in from the Item Master · your department is taken from your account</span>
        </div>
        <div className="p-4">
          {loadingItems ? (
            <div className="py-8 text-center text-gray-400 text-sm"><Loader2 className="animate-spin mx-auto mb-2" size={20} />Loading Item Master…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-200">
                    <th className="text-left font-bold py-2 w-8">#</th>
                    <th className="text-left font-bold py-2 w-[45%]">Item</th>
                    <th className="text-left font-bold py-2 w-24">Unit</th>
                    <th className="text-left font-bold py-2 w-36">Required Qty</th>
                    <th className="text-left font-bold py-2">Remarks</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.rowId} className="border-b border-gray-50 align-top">
                      <td className="py-2 text-gray-400 text-xs pt-4">{idx + 1}</td>
                      <td className="py-2 pr-3">
                        <ItemCell row={r} allItems={allItems} takenCodes={takenCodes} onPick={pickItem} />
                      </td>
                      <td className="py-2 pr-3"><input className={`${FIELD_CLS} bg-gray-50`} readOnly value={r.uom} /></td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0" step="any" className={FIELD_CLS} value={r.qty}
                          onChange={e => patchRow(r.rowId, { qty: e.target.value })} placeholder="0" />
                      </td>
                      <td className="py-2 pr-3">
                        <input className={FIELD_CLS} value={r.remarks} onChange={e => patchRow(r.rowId, { remarks: e.target.value })} placeholder="Optional" />
                      </td>
                      <td className="py-2 text-center">
                        <button type="button" onClick={() => removeRow(r.rowId)} className="text-gray-300 hover:text-red-500 p-1" title="Remove row">
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <Button variant="secondary" size="sm" icon={Plus} onClick={addRow}>Add Row</Button>
            <span className="text-xs text-gray-400">{filledRows.length} item{filledRows.length !== 1 ? 's' : ''} ready</span>
          </div>
        </div>
      </section>

      {/* Indent Details and Requirements — second card */}
      <section className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Indent Details and Requirements</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          <div>
            <label className={LABEL_CLS}>Priority</label>
            <select className={FIELD_CLS} value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Overall Remarks</label>
            <input className={FIELD_CLS} value={overallRemarks} onChange={e => setOverallRemarks(e.target.value)}
              placeholder="e.g. Materials required for upcoming cleaning activity and routine department operations." />
          </div>
          {priority === 'Critical' && (
            <div className="md:col-span-2">
              <label className={LABEL_CLS}>Reason for Critical Priority <span className="text-red-500">*</span></label>
              <input className={FIELD_CLS} value={criticalReason} onChange={e => setCriticalReason(e.target.value)} placeholder="Why is this critical?" />
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="outline-gray" onClick={() => save(false)} loading={busy}>Save Draft</Button>
        <Button variant="primary" onClick={() => { setError(''); const v = validate(); if (v) setError(v); else setConfirmOpen(true) }}>
          Submit Indent
        </Button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Submit Material Indent?"
        message={`${filledRows.length} item(s) — Priority: ${priority}. Once submitted the Store processes it via QR-based issue; items can't be edited after submission.`}
        acceptText="Submit Indent"
        loading={busy}
        onAccept={() => save(true)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
