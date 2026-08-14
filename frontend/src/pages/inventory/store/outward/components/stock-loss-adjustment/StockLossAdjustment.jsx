import { useState } from 'react'
import { outwardApi, packsApi, rmApi } from '../../../../../../api/inventory.js'
import { Button, IconButton } from '../../../../../../components/ui'
import ScannerPanel from '../../../../../../components/ScannerPanel/ScannerPanel.jsx'
import { convertByDensity } from '../../../../../../utils/uom.js'
import { X } from 'lucide-react'
import './StockLossAdjustment.css'


const REASONS = [
  'Production spillage',
  'Damaged / broken bag',
  'Moisture loss / evaporation',
  'Quality rejection',
  'Weighing error correction',
  'Other',
]

export default function StockLossAdjustment() {
  const [pack,       setPack]       = useState(null)
  // RM Master row for the scanned pack's item — carries inventoryUom /
  // operationalUom / density, so a loss measured on the shop floor in the
  // operational unit (e.g. 2 L spilled) can be entered as-measured even
  // though stock is tracked in KG. null when the item isn't in RM Master.
  const [rm,         setRm]         = useState(null)
  const [lossQty,    setLossQty]    = useState('')
  const [reason,     setReason]     = useState('')
  const [customReason, setCustomReason] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [submitting, setSub]        = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  // ─── Load pack by ID ─────────────────────────────────────────────────────
  const loadPack = async (packId) => {
    if (!packId) return
    setError(''); setSuccess(''); setPack(null); setRm(null); setLossQty(''); setReason(''); setCustomReason('')
    setLoading(true)
    try {
      const r = await packsApi.get(packId)
      if (!r.data) { setError(`Pack "${packId}" not found.`); return }

      // packsApi.get returns PrintMaster — get balance via availablePacks
      const balRes = await outwardApi.availablePacks(r.data.itemCode)

      const balance = (balRes.data || []).find(p => p.packId === packId)
      if (!balance) {
        setError(`Bag "${packId}" has no remaining quantity — already exhausted.`)
        return
      }
      setPack({ ...r.data, remainingQty: balance.remainingQty })
      // Best-effort — a missing RM row just means no conversion is offered
      // (entry stays in the pack's own unit); the server is the authority.
      rmApi.get(r.data.itemCode).then(res => setRm(res.data || null)).catch(() => setRm(null))
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load pack.')
    } finally {
      setLoading(false)
    }
  }

  // ─── UOM conversion (display + validation only) ───────────────────────────
  // Inventory UOM is what pack.remainingQty and every ledger figure are in;
  // entryUom is what the operator types the loss in. Identical unless the
  // item has a distinct Operational UOM configured.
  const inventoryUom = rm?.inventoryUom || pack?.uom || ''
  const entryUom     = rm?.operationalUom || inventoryUom
  const converts     = Boolean(entryUom && inventoryUom && entryUom !== inventoryUom)
  // Same rule the server enforces in resolveIssueQty — two different units
  // with no Conversion Required flag (or no density) can't be converted, so
  // say so here instead of letting the operator type a qty that will be
  // rejected on submit.
  const misconfigured = converts && (!rm?.conversionRequired || !rm?.density)

  // Falls back to the qty unchanged when conversion isn't possible (same
  // unit, no RM row, or missing density) — the server re-derives and
  // validates the real conversion before deducting stock.
  const convert = (qty, from, to) => {
    try { return convertByDensity(qty, from, to, rm?.density).qty }
    catch { return qty }
  }
  const toInventory = (entryQty) => convert(entryQty, entryUom, inventoryUom)
  const toEntry     = (invQty)   => convert(invQty, inventoryUom, entryUom)

  // The most the operator can enter, expressed in the unit they're typing in.
  const maxEntryQty = pack ? toEntry(pack.remainingQty) : 0

  const lossNum       = parseFloat(lossQty)
  const lossValid     = !isNaN(lossNum) && lossNum > 0 && lossNum <= maxEntryQty + 0.0001
  const lossInventory = lossValid ? toInventory(lossNum) : 0

  // ─── Submit adjustment ───────────────────────────────────────────────────
  const submit = async () => {
    const loss = parseFloat(lossQty)
    const finalReason = reason === 'Other' ? customReason.trim() : reason
    if (!pack)              { setError('Scan or enter a bag first');  return }
    if (!loss || loss <= 0) { setError('Enter a valid loss quantity'); return }
    // Best-effort client-side ceiling only — `loss` is in the entry
    // (Operational) UOM while remainingQty is Inventory UOM, so it has to be
    // converted before comparing. The server re-derives and re-checks this.
    if (toInventory(loss) > pack.remainingQty) {
      setError(`Loss exceeds remaining qty (${pack.remainingQty} ${inventoryUom})`); return
    }
    if (!finalReason || finalReason.length < 3) { setError('Select or enter a reason'); return }

    setSub(true); setError(''); setSuccess('')
    try {
      // lossQty is sent in the item's Operational UOM — the server converts
      // it through density and returns what it actually deducted.
      const r = await outwardApi.lossAdjustment({ packId: pack.packId, lossQty: loss, reason: finalReason })
      const invUom  = r.inventoryUom || inventoryUom
      const entered = `${loss} ${r.operationalUom || entryUom}`
      const deducted = Number(r.lossDeducted)
      setSuccess(
        `Adjusted: ${entered}${deducted !== loss ? ` (${deducted.toFixed(3)} ${invUom} deducted)` : ''} from ${pack.packId}. ` +
        `Remaining: ${Number(r.newRemaining).toFixed(3)} ${invUom} · Status: ${r.newStatus.replace('_', ' ')}`
      )
      setPack(null); setRm(null); setLossQty(''); setReason(''); setCustomReason('')
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setSub(false)
    }
  }

  const reset = () => {
    setPack(null); setRm(null); setLossQty(''); setReason(''); setCustomReason('')
    setError('')
  }

  return (
    <div className="p-4 md:p-6 max-w-xl">

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* ─── Step 1: Scan bag ─── */}
      {!pack && (
        <div>
          <p className="text-sm text-gray-500 mb-5">
            Scan the bag QR code to record a stock loss against that specific bag.
          </p>

          <ScannerPanel
            accent="red"
            onScan={(val) => loadPack((val.startsWith('PACK:') ? val.slice(5) : val).trim())}
            scanHint="Point at bag QR code"
            allowManualEntry={false}
          />
          {loading && <p className="text-xs text-gray-400 mt-2">Loading…</p>}
        </div>
      )}

      {/* ─── Step 2: Pack loaded — enter loss ─── */}
      {pack && (
        <div className="space-y-4">

          {/* Pack info card */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-0.5">Selected Bag</div>
                <div className="font-mono text-sm font-bold text-red-900 truncate">{pack.packId}</div>
                <div className="text-sm text-red-700 mt-0.5 font-medium truncate">{pack.itemName}</div>
                <div className="text-xs text-red-500 mt-0.5">
                  Lot: {pack.lotNo} · Bag #{pack.bagNo} · Supplier: {pack.supplier || '—'}
                </div>
              </div>
              <IconButton icon={X} onClick={reset} variant="danger" size="sm" tooltip="Clear" className="flex-shrink-0" />
            </div>

            {/* Available qty bar */}
            <div className="mt-3 bg-white rounded-lg px-3 py-2.5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">Remaining Qty</span>
                <span className="font-bold text-gray-800">{pack.remainingQty} {inventoryUom}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (pack.remainingQty / (pack.packQty || pack.remainingQty)) * 100)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0</span>
                <span>Original: {pack.packQty || '—'} {inventoryUom}</span>
              </div>
              {/* Only shown for items configured with a distinct Operational
                  UOM — makes it explicit that the same physical stock reads
                  as two different numbers depending on the unit. */}
              {converts && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">
                    In {entryUom} <span className="text-gray-400 font-normal">(operational)</span>
                  </span>
                  <span className="font-bold text-gray-800">{maxEntryQty.toFixed(3)} {entryUom}</span>
                </div>
              )}
            </div>
          </div>

          {/* Conversion notice — the operator types in the operational unit
              but stock moves in the inventory unit; state the density that
              bridges them rather than converting silently. */}
          {converts && !misconfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              This item is stocked in <strong>{inventoryUom}</strong> but issued in <strong>{entryUom}</strong>.
              Enter the loss in <strong>{entryUom}</strong> — converted at <strong>{rm.density} kg/L</strong>.
            </div>
          )}
          {misconfigured && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              <strong>{rm?.itemName || pack.itemName}</strong> is stocked in <strong>{inventoryUom}</strong> but
              issued in <strong>{entryUom}</strong>, and can't be converted:{' '}
              {!rm?.conversionRequired ? 'it is not flagged "Conversion Required"' : 'no density is set'} in
              RM Master. Fix the item there before recording a loss against it.
            </div>
          )}

          {/* Loss quantity — entered in the Operational UOM */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Loss Quantity ({entryUom}) * <span className="text-xs font-normal text-gray-400">(max {maxEntryQty.toFixed(3)} {entryUom})</span>
            </label>
            <input
              type="number" min="0.001" step="0.001" max={maxEntryQty}
              value={lossQty}
              onChange={e => setLossQty(e.target.value)}
              placeholder={`0.000 ${entryUom}`}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
            />
            {lossValid && (
              <p className="text-xs text-gray-400 mt-1.5">
                {converts && (
                  <>Deducts <strong className="text-gray-700">{lossInventory.toFixed(3)} {inventoryUom}</strong> · </>
                )}
                After adjustment: <strong className="text-gray-700">{(pack.remainingQty - lossInventory).toFixed(3)} {inventoryUom}</strong> remaining
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`text-xs px-3 py-2 rounded-lg border text-left transition ${
                    reason === r
                      ? 'bg-red-500 border-red-500 text-white font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Other' && (
              <input
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe the reason…"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
              />
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={submit}
            disabled={submitting || misconfigured || !lossQty || !reason || (reason === 'Other' && !customReason.trim())}
            loading={submitting}
            variant="danger-solid"
            fullWidth>
            {submitting ? 'Adjusting…' : 'Record Stock Loss'}
          </Button>

        </div>
      )}
    </div>
  )
}
