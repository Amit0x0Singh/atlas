import { useState, useEffect } from 'react'
import { Modal, Button } from '../../../../../../components/ui'
import { formatMeasurement } from '../../../../../../utils/measurement/formatMeasurement.js'
import { ALL_DISPLAY_UNITS } from '../../../../../../utils/uom.js'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'

const ROLE_OPTIONS = [
  ['INGREDIENT', 'Ingredient'],
  ['MICROBE', 'Microbe / CFU'],
  ['CARRIER', 'Carrier 🔄'],
  ['BASE', 'Base'],
]

// Matches whatever's actually stored (any case, e.g. "Kg"/"KG"/"kg", or the
// canonical "KG"/"L" this recipe module saves under) to one of the fixed
// dropdown options — free-text UOM entry is exactly how a stray "q.s"
// annotation or a case-only variant ended up splitting one real total into
// several confusing lines, so the dropdown now only ever offers real units.
function matchUomOption(rawUom) {
  const key = String(rawUom || '').trim().toLowerCase()
  return ALL_DISPLAY_UNITS.find((opt) => opt.toLowerCase() === key) || 'kg'
}

// All editing for one BOM row lives here — item search/selection, qty, uom,
// role — so the table itself (BomRow.jsx) can stay a read-only summary.
// Edits are held in a local draft and only ever reach the real row (via
// onUpdateRow/onSelectRm) when "Done" is clicked — Cancel, the backdrop, and
// Esc all just discard the draft, so the popup behaves like a real
// edit-then-commit dialog instead of live-editing the row underneath it.
export default function BomRowEditModal({
  open, onClose, row, idx, isProductCode, rmList = [], productList = [], microbeList = [],
  onUpdateRow, onSelectRm,
}) {
  const [draft, setDraft] = useState(null)
  const [search, setSearch] = useState('')
  const [dropOpen, setDropOpen] = useState(false)
  const [pickedHit, setPickedHit] = useState(null)

  // Snapshot the row into a local draft each time the modal opens — never
  // synced back the other way, so parent-side changes while it's open
  // (there aren't any today, but future-proof) can't clobber in-progress edits.
  useEffect(() => {
    if (open && row) {
      setDraft({ rmCode: row.rmCode, rmName: toTitleCase(row.rmName), uom: matchUomOption(row.uom), qtyPerUnit: row.qtyPerUnit, roleType: row.roleType, requiredCfu: row.requiredCfu ?? '' })
      setSearch(toTitleCase(row.rmName) || '')
      setDropOpen(false)
      setPickedHit(null)
    }
  }, [open, row])

  if (!open || !draft) return null

  const q = (search || '').toLowerCase()
  const hits = [
    ...rmList
      .filter((r) => !q || r.itemName.toLowerCase().includes(q) || r.itemCode.toLowerCase().includes(q))
      .map((r) => ({ kind: 'rm', code: r.itemCode, name: toTitleCase(r.itemName), uom: r.inventoryUom, raw: r })),
    ...productList
      .filter((p) => !q || p.productName.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q))
      .map((p) => ({ kind: 'product', code: p.productCode, name: toTitleCase(p.productName), raw: p })),
    ...microbeList
      .filter((m) => !q || m.microbeName.toLowerCase().includes(q) || m.microbeCode.toLowerCase().includes(q))
      .map((m) => ({ kind: 'microbe', code: m.microbeCode, name: toTitleCase(m.microbeName), uom: m.uom, raw: m })),
  ]

  const handleSelectHit = (hit) => {
    setSearch(hit.name)
    setDropOpen(false)
    setPickedHit(hit)
    setDraft((d) => ({
      ...d,
      rmName: hit.name,
      rmCode: hit.code,
      uom: hit.kind === 'product' || hit.kind === 'microbe' ? d.uom : matchUomOption(hit.uom || d.uom),
      // Picking an actual microbe unambiguously means this row's role is
      // Microbe/CFU — no reason to make the user also flip the Role dropdown.
      roleType: hit.kind === 'microbe' ? 'MICROBE' : (d.roleType === 'MICROBE' ? 'INGREDIENT' : d.roleType),
    }))
  }

  const handleDone = () => {
    if (pickedHit) onSelectRm(idx, pickedHit.raw, pickedHit.kind)
    else if (draft.rmName !== row.rmName) onUpdateRow(idx, 'rmName', draft.rmName)
    if (String(draft.qtyPerUnit) !== String(row.qtyPerUnit)) onUpdateRow(idx, 'qtyPerUnit', draft.qtyPerUnit)
    if (draft.uom !== row.uom) onUpdateRow(idx, 'uom', draft.uom)
    if (draft.roleType !== row.roleType) {
      onUpdateRow(idx, 'roleType', draft.roleType)
      // Role flipped away from Microbe without re-picking an item from the
      // search (pickedHit already handles the microbe-link fields when a
      // fresh item was selected) — clear the now-stale microbe link.
      if (draft.roleType !== 'MICROBE' && !pickedHit && row.isMicrobe) {
        onUpdateRow(idx, 'isMicrobe', false)
        onUpdateRow(idx, 'microbeCode', null)
      }
    }
    const draftCfu = draft.requiredCfu === '' ? null : draft.requiredCfu
    const rowCfu = row.requiredCfu ?? null
    if (String(draftCfu) !== String(rowCfu)) onUpdateRow(idx, 'requiredCfu', draftCfu)
    onClose()
  }

  const qty = parseFloat(draft.qtyPerUnit) || 0
  const friendly = formatMeasurement(qty, draft.uom)
  const showHint = friendly.category !== 'special' && friendly.unit.toLowerCase() !== String(draft.uom || '').trim().toLowerCase()

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Edit BOM Item</h3>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Item Name</label>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setDropOpen(true); setPickedHit(null); setDraft((d) => ({ ...d, rmName: e.target.value })) }}
              onFocus={() => setDropOpen(true)}
              onBlur={() => setTimeout(() => setDropOpen(false), 150)}
              placeholder="Type to search item..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
            {dropOpen && hits.length > 0 && (
              <div className="absolute z-30 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-44 overflow-y-auto">
                {hits.map((hit) => (
                  <button key={`${hit.kind}-${hit.code}`} type="button"
                    onMouseDown={() => handleSelectHit(hit)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
                    <span className="font-medium">{hit.name}</span>
                    {hit.kind === 'product' && (
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 ml-2 align-middle">SFG</span>
                    )}
                    {hit.kind === 'microbe' && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 ml-2 align-middle">MICROBE</span>
                    )}
                    <span className="text-gray-400 text-xs ml-2">{hit.code}</span>
                    {hit.uom && <span className="text-gray-300 text-xs ml-1">· {hit.uom}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Item Code</label>
            <div className="relative">
              <input value={draft.rmCode} readOnly
                className={`w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-blue-700 outline-none ${isProductCode(draft.rmCode) || draft.roleType === 'MICROBE' ? 'pr-16' : ''}`} />
              {isProductCode(draft.rmCode) && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5" title="This code comes from Product Master (SFG), not RM Master">SFG</span>
              )}
              {draft.roleType === 'MICROBE' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5" title="This code comes from Microbe Master">MICROBE</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Qty / 1 KG</label>
              <input type="number" step="0.001" min="0" value={draft.qtyPerUnit}
                onChange={(e) => setDraft((d) => ({ ...d, qtyPerUnit: e.target.value }))}
                placeholder="0.000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 text-right" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">UOM</label>
              <select value={draft.uom} onChange={(e) => setDraft((d) => ({ ...d, uom: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                {ALL_DISPLAY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          {showHint && <p className="text-xs text-gray-400 -mt-2">≈ {friendly.formatted}</p>}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Role</label>
            <select value={draft.roleType || 'INGREDIENT'} onChange={(e) => setDraft((d) => ({ ...d, roleType: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400">
              {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          {draft.roleType === 'MICROBE' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CFU / g</label>
              <input type="number" step="any" min="0" value={draft.requiredCfu}
                onChange={(e) => setDraft((d) => ({ ...d, requiredCfu: e.target.value }))}
                placeholder="e.g. 500000000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline-gray" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleDone}>Done</Button>
        </div>
      </div>
    </Modal>
  )
}
