import { Field, Inp, Sel, SecLabel } from './FormFields.jsx'

import { toTitleCase } from '../../../../../../utils/textDisplay.js'
export default function AssignmentAndExtrasSection({
  cfg,
  incharge, setIncharge,
  equipment, setEquipment, effectiveEquipment,
  showLocation, location, setLocation,
  showCarrier, carrier, setCarrier,
  showSpecs, specs, setSpecs,
  showPackAfterWrap, packAfter, setPackAfter,
  showSfgPicker, sfgSourceId, onSfgSelect, sfgHint, availableSfg,
}) {
  return (
    <>
      <SecLabel>Assignment</SecLabel>
      <div className="grid grid-cols-2 gap-3 mb-1">
        <Field label="Batch Incharge *">
          <Sel value={incharge} onChange={e => setIncharge(e.target.value)}>
            {cfg.incharge.map(i => <option key={i}>{i}</option>)}
          </Sel>
        </Field>
        <Field label={cfg.equipLabel || 'Reactor / Vessel'}>
          <Sel value={equipment} onChange={e => setEquipment(e.target.value)}>
            <option value="">— Select —</option>
            {effectiveEquipment.map(e => <option key={e}>{e}</option>)}
          </Sel>
        </Field>
      </div>

      {showLocation && cfg.location && (
        <>
          <SecLabel>Location</SecLabel>
          <div className="mb-1">
            <Field label="Location *">
              <Sel value={location} onChange={e => setLocation(e.target.value)}>
                <option value="">— Select —</option>
                {cfg.location.map(l => <option key={l}>{l}</option>)}
              </Sel>
            </Field>
          </div>
        </>
      )}

      {(showCarrier || showSpecs) && (
        <>
          <SecLabel>Product Specifications</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-1">
            {showCarrier && cfg.carrier && (
              <Field label="Carrier">
                <Sel value={carrier} onChange={e => setCarrier(e.target.value)}>
                  <option value="">— Select —</option>
                  {cfg.carrier.map(c => <option key={c}>{c}</option>)}
                </Sel>
              </Field>
            )}
            {showSpecs && (
              <Field label="Specs (CFU/g)" hint="e.g. 1.00E+09">
                <Inp value={specs} onChange={e => setSpecs(e.target.value)} placeholder="e.g. 1.00E+09" />
              </Field>
            )}
          </div>
        </>
      )}

      {showPackAfterWrap && (
        <>
          <SecLabel>SFG / Packing Decision</SecLabel>
          <div className="mb-3">
            <Field label="Packing Also? (this formulation batch)">
              <Sel value={packAfter} onChange={e => setPackAfter(e.target.value)}>
                <option value="YES">Yes — Pack immediately after formulation</option>
                <option value="NO">No — Store as SFG for later packing</option>
              </Sel>
            </Field>
            {packAfter === 'NO' && (
              <p className="text-[11px] text-blue-600 mt-1 bg-blue-50 px-3 py-2 rounded-lg">
                After BMR sign-off, the post-sieving quantity is stored as SFG for a future packing task.
              </p>
            )}
          </div>
        </>
      )}

      {showSfgPicker && (
        <>
          <SecLabel>Pack from SFG Stock</SecLabel>
          <div className="mb-3">
            <Field label="Select SFG Batch (optional)" hint={sfgHint}>
              <Sel value={sfgSourceId} onChange={e => onSfgSelect(e.target.value)}>
                <option value="">— Not from SFG —</option>
                {availableSfg.map(s => (
                  <option key={s.id} value={s.id}>
                    {toTitleCase(s.productName)} — {s.batchCode} — {s.qtyRemaining} {s.qtyUom} @ {s.location || '—'}
                  </option>
                ))}
              </Sel>
            </Field>
          </div>
        </>
      )}
    </>
  )
}
