import { useState } from 'react'
import { BField, BInp, BSel, BSection, BGrid } from './BFormFields.jsx'
import { buildFormulationRows } from './ProtocolRows.jsx'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'

// ── Powder / Granules / Liquid BMR — 5 pages ─────────────────────────────────
export default function PowderBMR({ task, comps }) {
  const [page, setPage] = useState(0)
  const todayVal = new Date().toISOString().slice(0,10)
  const pages = ['1 · Batch Header','2 · Formulation','3 · Process Details','4 · Packing','5 · QC Sampling']

  return (
    <div>
      <div className="flex bg-gray-50 border-b border-gray-200 px-7 overflow-x-auto">
        {pages.map((p,i) => (
          <button key={i} onClick={() => setPage(i)}
            className={`py-2.5 px-4 text-[12px] font-semibold border-b-[3px] -mb-px whitespace-nowrap transition
              ${page===i ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-700'}`}>
            {p}
          </button>
        ))}
      </div>

      {page === 0 && (
        <BSection title="📋 Batch Header">
          <BGrid cols={4}>
            <BField label="Date"><BInp type="date" data-bmr-field="date" defaultValue={todayVal}/></BField>
            <BField label="Equipment"><BInp type="text" data-bmr-field="equipment" defaultValue={task.equipment||''}/></BField>
            <BField label="Temperature (°C)"><BInp type="number" data-bmr-field="temperature" step="0.1"/></BField>
            <BField label="Humidity & Weather"><BInp type="text" data-bmr-field="humidity-weather" defaultValue="Clear"/></BField>
            <BField label="CFU Count Ordered"><BInp type="text" data-bmr-field="cfu-ordered" defaultValue={task.specs||''}/></BField>
            <BField label="Equip. Cleaning Date & Time"><BInp type="datetime-local" data-bmr-field="equip-cleaning-dt"/></BField>
            <BField label="Cleaning Status"><BSel data-bmr-field="cleaning-status"><option value="Clean">Clean</option><option value="Not Clean">Not Clean</option></BSel></BField>
            <BField label="Location"><BInp type="text" data-bmr-field="location" defaultValue={toTitleCase(task.location)||''}/></BField>
          </BGrid>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BField label="Batch Started By"><BInp type="text" data-bmr-field="batch-started-by" defaultValue={task.incharge||''}/></BField>
            <BField label="Batch Completed By"><BInp type="text" data-bmr-field="batch-completed-by"/></BField>
          </div>
        </BSection>
      )}

      {page === 1 && (
        <BSection title="🧪 Formulation">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <BField label="SFG Used"><BSel data-bmr-field="sfg-used"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="SFG Details (DI / DOF / Qty)"><BInp type="text" data-bmr-field="sfg-details"/></BField>
            <BField label="Carrier"><BInp type="text" data-bmr-field="carrier" defaultValue={toTitleCase(task.carrier)||''}/></BField>
            <BField label="No. of Workers"><BInp type="number" data-bmr-field="no-workers" min="1"/></BField>
            <BField label="M / F / M+F"><BSel data-bmr-field="worker-gender"><option>M</option><option>F</option><option>M+F</option></BSel></BField>
            <BField label="Equipment Used"><BInp type="text" data-bmr-field="equipment-used" defaultValue={task.equipment||''}/></BField>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr className="bg-gray-50">
                {['S.No','Raw Material','Std Qty & UOM','Added ✓','Seq.','Time Added','Remarks'].map(h => (
                  <th key={h} className="px-2 py-2 text-[10.5px] font-bold text-gray-500 uppercase border-b-2 border-gray-200 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>{buildFormulationRows(comps)}</tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BField label="Total Qty (kg)"><BInp type="number" data-bmr-field="total-qty" step="0.001"/></BField>
            <BField label="Sample ID"><BInp type="text" data-bmr-field="sample-id"/></BField>
          </div>
        </BSection>
      )}

      {page === 2 && (
        <BSection title="⏱ Process Details">
          <BGrid>
            <BField label="RM Charging Start"><BInp type="time" data-bmr-field="rm-charge-start"/></BField>
            <BField label="RM Charging End"><BInp type="time" data-bmr-field="rm-charge-end"/></BField>
            <BField label="Blending Start"><BInp type="time" data-bmr-field="blend-start"/></BField>
            <BField label="Blending End"><BInp type="time" data-bmr-field="blend-end"/></BField>
            <BField label="Unloading Start"><BInp type="time" data-bmr-field="unload-start"/></BField>
            <BField label="Unloading End"><BInp type="time" data-bmr-field="unload-end"/></BField>
            <BField label="Weight After Unloading (kg)"><BInp type="number" data-bmr-field="weight-after-unload" step="0.001"/></BField>
            <BField label="Weight After Sieving (kg)"><BInp type="number" data-bmr-field="weight-after-sieve" step="0.001"/></BField>
            <BField label="Sieving"><BSel data-bmr-field="sieving"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="Mesh Size"><BInp type="text" data-bmr-field="mesh-size"/></BField>
            <BField label="Sieving Start"><BInp type="time" data-bmr-field="sieve-start"/></BField>
            <BField label="Sieving End"><BInp type="time" data-bmr-field="sieve-end"/></BField>
            <BField label="Incharge"><BInp type="text" data-bmr-field="process-incharge" defaultValue={task.incharge||''}/></BField>
            <BField label="No. of Workers"><BInp type="number" data-bmr-field="process-workers" min="1"/></BField>
          </BGrid>
          <div className="mt-4 border-2 border-dashed border-amber-300 rounded-lg p-4 bg-amber-50">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">⚠ Deviation Record</div>
            <textarea data-bmr-field="process-deviation" rows={3} placeholder="Any deviation from standard process..."
              className="w-full px-3 py-2 border-[1.5px] border-amber-300 rounded-lg text-[13px] resize-vertical"/>
          </div>
        </BSection>
      )}

      {page === 3 && (
        <BSection title="📦 Packing Details">
          <div className="grid grid-cols-3 gap-3">
            <BField label="Date of Packing"><BInp type="date" data-bmr-field="packing-date"/></BField>
            <BField label="Qty Received (kg)"><BInp type="number" data-bmr-field="packing-recv-qty" step="0.001"/></BField>
            <BField label="No. of Workers"><BInp type="number" data-bmr-field="packing-workers" min="1"/></BField>
            <BField label="Type of Packing"><BInp type="text" data-bmr-field="packing-type"/></BField>
            <BField label="Primary Packing"><BInp type="text" data-bmr-field="primary-packing" defaultValue={task.primaryPack||''}/></BField>
            <BField label="Secondary Packing"><BInp type="text" data-bmr-field="secondary-packing" defaultValue={task.secondaryPack||''}/></BField>
            <BField label="Unit Pack Weight"><BInp type="text" data-bmr-field="unit-pack-weight" defaultValue={task.unitPackQty||''}/></BField>
            <BField label="Total Units Packed"><BInp type="number" data-bmr-field="total-units-packed" defaultValue={task.noUnits||''}/></BField>
            <BField label="Total Qty Packed (kg)"><BInp type="number" data-bmr-field="total-qty-packed" step="0.001"/></BField>
            <BField label="Units per CBB/Bag/Drum"><BInp type="number" data-bmr-field="units-per-pack" defaultValue={task.unitsPerSecPack||''}/></BField>
            <BField label="Total Outer Packages"><BInp type="number" data-bmr-field="total-outer-packs" defaultValue={task.totalSecPacks||''}/></BField>
            <BField label="Labels"><BInp type="text" data-bmr-field="labels" defaultValue={task.labels||''}/></BField>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <BField label="Stretch Film"><BSel data-bmr-field="stretch-film"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="Carry Strapping"><BSel data-bmr-field="carry-strapping"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="CS Start Time"><BInp type="time" data-bmr-field="cs-start-time"/></BField>
            <BField label="CS End Time"><BInp type="time" data-bmr-field="cs-end-time"/></BField>
            <BField label="Leftover Qty (kg)"><BInp type="number" data-bmr-field="leftover-qty" step="0.001"/></BField>
            <BField label="Leftover Stored At"><BInp type="text" data-bmr-field="leftover-location"/></BField>
          </div>
        </BSection>
      )}

      {page === 4 && (
        <BSection title="🧪 QC Sampling">
          <BGrid>
            <BField label="Sample Collected"><BSel data-bmr-field="sample-collected"><option value="YES">YES</option><option value="NO">NO</option></BSel></BField>
            <BField label="Collected at Which Process"><BInp type="text" data-bmr-field="sample-at-process"/></BField>
            <BField label="Sample ID"><BInp type="text" data-bmr-field="qc-sample-id"/></BField>
            <BField label="Submitted On"><BInp type="date" data-bmr-field="sample-submitted-on"/></BField>
            <BField label="Sent to Inventory On"><BInp type="date" data-bmr-field="sent-to-inventory"/></BField>
            <BField label="Handed Over To"><BInp type="text" data-bmr-field="handed-over-to"/></BField>
            <BField label="SGF Updated"><BSel data-bmr-field="sgf-updated"><option value="NO">NO</option><option value="YES">YES</option></BSel></BField>
            <BField label="Incharge"><BInp type="text" data-bmr-field="qc-incharge" defaultValue={task.incharge||''}/></BField>
          </BGrid>
        </BSection>
      )}
    </div>
  )
}
