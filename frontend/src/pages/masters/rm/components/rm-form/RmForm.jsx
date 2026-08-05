import { Save, X, Package, Hash, Beaker, Layers, Gauge } from 'lucide-react'
import { Button, IconButton, InfoTooltip } from '../../../../../components/ui'
import { CANONICAL_UNITS } from '../../../../../utils/uom.js'
import './RmForm.css'

const LABEL = 'block text-xs font-medium text-gray-700 mb-1'
const FIELD = 'w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none disabled:bg-gray-100 disabled:hover:border-gray-300'
const HINT = 'text-[11px] text-gray-400'

function SectionHeading({ icon: Icon, tone, children }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className={`w-5 h-5 rounded-md flex items-center justify-center ${tone}`}>
        <Icon size={11} strokeWidth={2.5} />
      </span>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{children}</p>
    </div>
  )
}

export default function RmForm({ editing, form, onChange, saving, msg, onSave, onClose }) {
  // Mirrors the backend guard exactly (rm-master.controller.js) — density is
  // only actually required once the two UOMs genuinely differ, regardless of
  // physical State (that field is just classification, not what drives the
  // conversion requirement).
  const needsDensity = !!form.operationalUom && form.operationalUom !== form.inventoryUom
  const densityMissing = needsDensity && (form.density === '' || form.density == null)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0 bg-gradient-to-br from-blue-50/80 to-white rounded-t-2xl">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <Package size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">{editing ? 'Edit Item' : 'Add New Item'}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                PACK: individual QR label per bag/pack · BULK: single location QR tracks multiple lots
              </p>
            </div>
          </div>
          <IconButton icon={X} tooltip="Close" onClick={onClose} className="bg-white/70" />
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4 bg-gray-50/40">
          {msg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{msg}</div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <SectionHeading icon={Hash} tone="bg-blue-50 text-blue-600">Identification</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={LABEL}>Item Code *</label>
                <input
                  value={form.itemCode}
                  onChange={e => onChange('itemCode', e.target.value.replace(/\D/g, '').slice(0, 7))}
                  disabled={!!editing}
                  placeholder="e.g. 1514640"
                  inputMode="numeric"
                  maxLength={7}
                  className={`${FIELD} font-mono`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Item Name *</label>
                <input
                  value={form.itemName}
                  onChange={e => onChange('itemName', e.target.value)}
                  placeholder="e.g. PP Bags 50 kg"
                  className={FIELD}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <SectionHeading icon={Beaker} tone="bg-indigo-50 text-indigo-600">Units & Tracking</SectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={LABEL}>Inventory UOM *</label>
                <select
                  value={form.inventoryUom}
                  onChange={e => onChange('inventoryUom', e.target.value)}
                  className={FIELD}
                >
                  {/* This item's tracking unit has no accompanying quantity to
                      convert here — it's the canonical unit every future
                      quantity for this item gets stored in, so only offer the
                      3 the database actually stores. */}
                  {CANONICAL_UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Operational UOM</label>
                <select
                  value={form.operationalUom || ''}
                  onChange={e => onChange('operationalUom', e.target.value)}
                  className={FIELD}
                >
                  <option value="">— Same as Inventory UOM —</option>
                  {CANONICAL_UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                  Tracking Type *
                  <InfoTooltip title="Tracking Type">
                    <p><strong className="text-white">Pack:</strong> Generates a unique QR code for each individual package or bag.</p>
                    <p className="mt-1"><strong className="text-white">Bulk:</strong> Generates a QR code for the storage location, applicable to bulk materials such as cartons, bags, labels and consumables.</p>
                  </InfoTooltip>
                </label>
                <select
                  value={form.trackingType}
                  onChange={e => onChange('trackingType', e.target.value)}
                  className={FIELD}
                >
                  <option value="PACK">PACK — QR per bag</option>
                  <option value="BULK">BULK — Location QR</option>
                </select>
              </div>
              {/* Conversion Required isn't a separate manual input — it's
                  purely derived from whether the two UOMs differ (see
                  RmMaster.jsx's save()), so this slot shows Density instead,
                  only once it's actually needed. */}
              {needsDensity && (
                <div>
                  <label className={`${LABEL} ${densityMissing ? 'text-red-600' : ''}`}>
                    Density (kg/L) *
                  </label>
                  <input
                    type="number" step="any"
                    value={form.density ?? ''}
                    onChange={e => onChange('density', e.target.value)}
                    placeholder="e.g. 0.91"
                    className={`${FIELD} ${densityMissing ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                  />
                </div>
              )}
            </div>
            {needsDensity && (
              <p className={`mt-2 text-[11px] ${densityMissing ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                Density converts between Inventory UOM ({form.inventoryUom}) and Operational UOM ({form.operationalUom}) when this item is issued.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <SectionHeading icon={Layers} tone="bg-violet-50 text-violet-600">Classification & Properties</SectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={LABEL}>Category</label>
                <input
                  value={form.category || ''}
                  onChange={e => onChange('category', e.target.value)}
                  placeholder="e.g. Solvent"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>Sub Category</label>
                <input
                  value={form.subCategory || ''}
                  onChange={e => onChange('subCategory', e.target.value)}
                  placeholder="e.g. Alcohol"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>State</label>
                <select
                  value={form.state || ''}
                  onChange={e => onChange('state', e.target.value)}
                  className={FIELD}
                >
                  <option value="">—</option>
                  <option value="SOLID">Solid</option>
                  <option value="LIQUID">Liquid</option>
                  <option value="GAS">Gas</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <SectionHeading icon={Gauge} tone="bg-amber-50 text-amber-600">Stock Levels</SectionHeading>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Low Stock Level</label>
                <input
                  type="number" step="any" min="0"
                  value={form.lowStockLevel ?? ''}
                  onChange={e => onChange('lowStockLevel', e.target.value)}
                  placeholder="e.g. 10"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL}>High Stock Level</label>
                <input
                  type="number" step="any" min="0"
                  value={form.highStockLevel ?? ''}
                  onChange={e => onChange('highStockLevel', e.target.value)}
                  placeholder="e.g. 500"
                  className={FIELD}
                />
              </div>
            </div>
            <p className={`${HINT} mt-2`}>
              Reorder thresholds in {form.inventoryUom || 'the item\'s Inventory UOM'} — Low flags when stock needs replenishing, High flags overstock.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 shrink-0 bg-white rounded-b-2xl">
          <Button variant="secondary" size="sm" icon={X} onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={Save} onClick={onSave} disabled={saving} loading={saving}>
            {saving ? 'Saving...' : 'Save Item'}
          </Button>
        </div>
      </div>
    </div>
  )
}
