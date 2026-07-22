import { Field, Inp, Sel, SecLabel } from './FormFields.jsx'

export default function PackingDetailsSection({
  cfg, plant,
  primaryPack, setPrimaryPack,
  inners, setInners,
  secondaryPack, setSecondaryPack,
  unitPackQty, setUnitPackQty,
  noUnits,
  unitsPerSecPack, setUnitsPerSecPack,
  totalSecPacks,
  labels, setLabels,
}) {
  return (
    <>
      <SecLabel>Packing Details</SecLabel>
      <div className="grid grid-cols-3 gap-3 mb-1">
        <Field label="Primary Pack">
          <Sel value={primaryPack} onChange={e => setPrimaryPack(e.target.value)}>
            <option value="">— Select —</option>
            {(cfg.primaryPack || []).map(p => <option key={p}>{p}</option>)}
          </Sel>
        </Field>
        {cfg.inners && (
          <Field label="Inners">
            <Sel value={inners} onChange={e => setInners(e.target.value)}>
              <option value="">— Select —</option>
              {cfg.inners.map(i => <option key={i}>{i}</option>)}
            </Sel>
          </Field>
        )}
        <Field label="Secondary Pack">
          <Sel value={secondaryPack} onChange={e => setSecondaryPack(e.target.value)}>
            <option value="">— Select —</option>
            {(cfg.secondaryPack || []).map(s => <option key={s}>{s}</option>)}
          </Sel>
        </Field>
        <Field label={`Unit Pack Qty (${plant === 'Liquid' ? 'L' : 'kg'})`}>
          <Inp type="number" step="0.001" value={unitPackQty} onChange={e => setUnitPackQty(e.target.value)} placeholder="e.g. 0.1" />
        </Field>
        <Field label="No. of Units">
          <Inp value={noUnits} readOnly className="bg-gray-50 text-gray-500" />
        </Field>
        <Field label="Units per Secondary Pack">
          <Inp type="number" step="1" value={unitsPerSecPack} onChange={e => setUnitsPerSecPack(e.target.value)} placeholder="e.g. 100" />
        </Field>
        <Field label="Total Secondary Packs">
          <Inp value={totalSecPacks} readOnly className="bg-gray-50 text-gray-500" />
        </Field>
        <Field label="Labels">
          <Sel value={labels} onChange={e => setLabels(e.target.value)}>
            <option value="">— Select —</option>
            {(cfg.labels || []).map(l => <option key={l}>{l}</option>)}
          </Sel>
        </Field>
      </div>
    </>
  )
}
