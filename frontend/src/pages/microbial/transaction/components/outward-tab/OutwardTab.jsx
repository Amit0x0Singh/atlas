import { useState } from 'react'
import { Plus, Send, RotateCcw } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { useMicrobes } from '../../../../../hooks/masters/useMicrobes.js'
import { usePreviewOutward, useCreateOutward, useMicrobialOutward, useEligibleBatches } from '../../../../../hooks/microbial/useMicrobialOutward.js'
import RequirementRow from './RequirementRow.jsx'
import RecentIssuances from './RecentIssuances.jsx'
import GrandSummary from './GrandSummary.jsx'
import AltContainerModal from './AltContainerModal.jsx'

let rid = 0
const newRow = () => ({
  id: `row-${++rid}`,
  microbe_id: '', microbe_code: '', microbe_name: '',
  required_qty_kg: '', required_cfu_per_g: '',
  calc: null,
})

const EMPTY_HEADER = {
  product_name: '', customer_name: '', di_number: '', batch_code: '',
  section: '', order_qty_kg: '', issuer_name: '', receiver_name: '',
}

export default function OutwardTab() {
  const [header, setHeader] = useState(EMPTY_HEADER)
  const [rows, setRows] = useState([newRow()])
  const [calculatingId, setCalculatingId] = useState(null)
  const [altPickerRow, setAltPickerRow] = useState(null)
  const [altBatches, setAltBatches] = useState([])

  const { data: microbes = [] } = useMicrobes()
  const preview = usePreviewOutward()
  const createOutward = useCreateOutward()
  const eligibleBatches = useEligibleBatches()
  const { data: recent = [] } = useMicrobialOutward()

  const setHeaderField = (k, v) => setHeader((p) => ({ ...p, [k]: v }))

  const updateRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id))
  const addRow = () => setRows((rs) => [...rs, newRow()])

  const calculateRow = async (row) => {
    setCalculatingId(row.id)
    try {
      const res = await preview.mutateAsync({
        requirements: [{ microbe_code: row.microbe_code, required_qty_kg: Number(row.required_qty_kg), required_cfu_per_g: Number(row.required_cfu_per_g) }],
      })
      const calc = res?.[0]
      if (calc?.error) { alert(calc.error); return }
      updateRow(row.id, {
        calc: {
          total_cfu_needed: calc.total_cfu_needed,
          remaining_cfu: calc.remaining_cfu,
          fulfilled: calc.fulfilled,
          allocations: calc.allocations,
        },
      })
    } catch (err) { alert(err.message) }
    setCalculatingId(null)
  }

  const updateAllocationQty = (rowId, inwardId, val) => {
    setRows((rs) => rs.map((r) => {
      if (r.id !== rowId || !r.calc) return r
      return { ...r, calc: { ...r.calc, allocations: r.calc.allocations.map((a) => (a.inward_id === inwardId ? { ...a, qty_issued_kg: val } : a)) } }
    }))
  }

  // Removing a suggested batch re-runs FEFO against the rest of the pool
  // (excluding the one just removed) to backfill the gap from any other
  // available batch/container — mirrors microbe.HTM's removeSugg().
  const removeAllocation = async (rowId, inwardId) => {
    const row = rows.find((r) => r.id === rowId)
    if (!row?.calc) return
    const keptAllocations = row.calc.allocations.filter((a) => a.inward_id !== inwardId)
    const reqCfuPerG = Number(row.required_cfu_per_g)
    const totalCfuNeeded = Number(row.required_qty_kg) * reqCfuPerG
    const coveredCfu = keptAllocations.reduce((s, a) => s + Number(a.qty_issued_kg) * Number(a.cfu_per_g), 0)
    const remainingCfu = Math.max(0, totalCfuNeeded - coveredCfu)
    const excludeIds = row.calc.allocations.map((a) => a.inward_id) // everything already suggested, kept or removed

    if (remainingCfu <= 0.0001) { updateRow(rowId, { calc: { ...row.calc, allocations: keptAllocations } }); return }

    try {
      const res = await preview.mutateAsync({
        requirements: [{ microbe_code: row.microbe_code, required_qty_kg: remainingCfu / reqCfuPerG, required_cfu_per_g: reqCfuPerG, exclude_inward_ids: excludeIds }],
      })
      const calc = res?.[0]
      const backfill = calc?.allocations || []
      updateRow(rowId, { calc: { ...row.calc, allocations: [...keptAllocations, ...backfill] } })
    } catch (err) { alert(err.message) }
  }

  const openAltPicker = async (rowId, allocationInwardId) => {
    const row = rows.find((r) => r.id === rowId)
    if (!row) return
    try {
      const batches = await eligibleBatches.mutateAsync(row.microbe_code)
      const usedIds = new Set(row.calc.allocations.map((a) => a.inward_id))
      setAltBatches(batches.filter((b) => !usedIds.has(b.inward_id) || b.inward_id === allocationInwardId))
      setAltPickerRow({ rowId, allocationInwardId })
    } catch (err) { alert(err.message) }
  }

  const swapAllocation = (altBatch) => {
    if (!altPickerRow) return
    const { rowId, allocationInwardId } = altPickerRow
    setRows((rs) => rs.map((r) => {
      if (r.id !== rowId || !r.calc) return r
      const old = r.calc.allocations.find((a) => a.inward_id === allocationInwardId)
      const qty = Math.min(Number(old?.qty_issued_kg || 0) || Number(altBatch.available_kg), Number(altBatch.available_kg))
      const replacement = {
        inward_id: altBatch.inward_id, container_id: altBatch.container_id, container_code: altBatch.container_code,
        type_code: altBatch.type_code, location: altBatch.location, biomass_batch_code: altBatch.biomass_batch_code,
        date_of_harvest: altBatch.date_of_harvest, expiry_date: altBatch.expiry_date, available_kg: altBatch.available_kg,
        qty_issued_kg: qty,
      }
      return { ...r, calc: { ...r.calc, allocations: r.calc.allocations.map((a) => (a.inward_id === allocationInwardId ? replacement : a)) } }
    }))
    setAltPickerRow(null)
  }

  const resetAll = () => { setHeader(EMPTY_HEADER); setRows([newRow()]) }

  const readyRows = rows.filter((r) => r.microbe_code && r.calc && r.calc.allocations.length)

  const handleSubmit = async () => {
    if (!header.product_name.trim()) { alert('Product name is required'); return }
    if (!readyRows.length) { alert('Calculate FEFO for at least one microbe requirement before issuing'); return }

    const shortRows = readyRows.filter((r) => {
      const picked = r.calc.allocations.reduce((s, a) => s + Number(a.qty_issued_kg || 0), 0)
      return picked + 0.0009 < Number(r.required_qty_kg)
    })
    if (shortRows.length) {
      const lines = shortRows.map((r) => {
        const picked = r.calc.allocations.reduce((s, a) => s + Number(a.qty_issued_kg || 0), 0)
        return `${r.microbe_name}: short by ${(Number(r.required_qty_kg) - picked).toFixed(3)} kg (will issue ${picked.toFixed(3)} of ${r.required_qty_kg} kg)`
      }).join('\n')
      if (!confirm(`The following microbe(s) have insufficient stock to fully cover the requirement:\n\n${lines}\n\nProceed and issue only the available quantity?`)) return
    }

    const payload = {
      ...header,
      order_qty_kg: header.order_qty_kg ? Number(header.order_qty_kg) : null,
      requirements: readyRows.map((r) => ({
        microbe_id: r.microbe_id, microbe_code: r.microbe_code, microbe_name: r.microbe_name,
        required_qty_kg: Number(r.required_qty_kg), required_cfu_per_g: Number(r.required_cfu_per_g),
        allocations: r.calc.allocations
          .filter((a) => Number(a.qty_issued_kg) > 0)
          .map((a) => ({ inward_id: a.inward_id, qty_issued_kg: Number(a.qty_issued_kg) })),
      })),
    }

    try {
      const result = await createOutward.mutateAsync(payload)
      alert(`Issued successfully — ${result.lines.length} batch pick(s) recorded for ${result.product_name}.`)
      resetAll()
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">Multi-Microbe Issuance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product Name *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={header.product_name} onChange={(e) => setHeaderField('product_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={header.customer_name} onChange={(e) => setHeaderField('customer_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">DI Number</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={header.di_number} onChange={(e) => setHeaderField('di_number', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Batch Code</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={header.batch_code} onChange={(e) => setHeaderField('batch_code', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Section</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={header.section} onChange={(e) => setHeaderField('section', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Order Qty (kg)</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="number" min="0" step="any" value={header.order_qty_kg} onChange={(e) => setHeaderField('order_qty_kg', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Issuer Name</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" value={header.issuer_name} onChange={(e) => setHeaderField('issuer_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Receiver Name</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={header.receiver_name} onChange={(e) => setHeaderField('receiver_name', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <RequirementRow
            key={row.id}
            index={i}
            row={row}
            microbes={microbes}
            canRemove={rows.length > 1}
            calculating={calculatingId === row.id}
            onChange={(patch) => updateRow(row.id, patch)}
            onCalculate={() => calculateRow(row)}
            onRemove={() => removeRow(row.id)}
            onAllocationQtyChange={(inwardId, val) => updateAllocationQty(row.id, inwardId, val)}
            onAllocationRemove={(inwardId) => removeAllocation(row.id, inwardId)}
            onAllocationChange={(inwardId) => openAltPicker(row.id, inwardId)}
          />
        ))}
        <Button type="button" variant="outline-gray" icon={Plus} onClick={addRow}>Add Microbe</Button>
      </div>

      <GrandSummary rows={rows} />

      <div className="flex gap-3">
        <Button type="button" variant="primary" icon={Send} disabled={createOutward.isPending} loading={createOutward.isPending} onClick={handleSubmit}>
          Confirm & Issue All
        </Button>
        <Button type="button" variant="outline-gray" icon={RotateCcw} onClick={resetAll}>Reset</Button>
      </div>

      <RecentIssuances items={recent} />

      <AltContainerModal
        open={!!altPickerRow}
        onClose={() => setAltPickerRow(null)}
        batches={altBatches}
        onSelect={swapAllocation}
      />
    </div>
  )
}
