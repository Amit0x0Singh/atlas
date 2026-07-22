import { useState } from 'react'
import { BField, BInp, BSel, BSection, BGrid, TickRow } from './BFormFields.jsx'
import { buildProtocolRows } from './ProtocolRows.jsx'

// ── Nano / Botanical BMR — 5 pages ────────────────────────────────────────────
export default function NanoBMR({ task, comps }) {
  const [page, setPage] = useState(0)
  const todayVal = new Date().toISOString().slice(0,10)
  const pages = ['1 · Pre-Start','2 · Reactor Cleaning','3 · Batch Process','4 · Formulation Protocol','5 · Close-Out & QC']

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
        <>
          <BSection title="📅 Batch Identity">
            <BGrid cols={4}>
              <BField label="Date"><BInp type="date" data-bmr-field="date" defaultValue={todayVal}/></BField>
              <BField label="Order Qty"><BInp type="text" data-bmr-field="order-qty" defaultValue={`${task.qty||''} ${task.qtyUom||''}`} readOnly className="bg-gray-50"/></BField>
              <BField label="Reactor / Vessel"><BInp type="text" data-bmr-field="reactor" defaultValue={task.equipment||''} readOnly className="bg-gray-50"/></BField>
              <BField label="Shift"><BInp type="text" data-bmr-field="shift" defaultValue={task.shift||'General'} readOnly className="bg-gray-50"/></BField>
            </BGrid>
          </BSection>
          <BSection title="🏭 Plant Start-Up">
            <BGrid>
              <BField label="Plant Lights Switch ON Time"><BInp type="time" data-bmr-field="lights-on-time"/></BField>
              <BField label="Reactor Lights ON Time"><BInp type="time" data-bmr-field="reactor-lights-time"/></BField>
            </BGrid>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Discharge Tank Status</div>
                <div className="flex gap-4 items-center">
                  {['Empty','Not Empty'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                      <input type="radio" name={`tank-${task.id}`} data-bmr-field="tank-status" value={v} defaultChecked={v==='Empty'}/> {v}
                    </label>
                  ))}
                  <BInp type="time" data-bmr-field="tank-status-time" className="w-28"/>
                </div>
              </div>
              <BField label="Temperature (°C)"><BInp type="number" data-bmr-field="temperature" step="0.1" placeholder="e.g. 28.5"/></BField>
            </div>
          </BSection>
          <BSection title="🧑‍🔧 Health Check">
            <BGrid>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Plant Engineers</div>
                <div className="flex gap-4">
                  {['Good','Unwell'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                      <input type="radio" name={`eng-h-${task.id}`} data-bmr-field="eng-health" value={v} defaultChecked={v==='Good'}/> {v}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Workers / Helpers</div>
                <div className="flex gap-4">
                  {['Good','Unwell'].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                      <input type="radio" name={`wrk-h-${task.id}`} data-bmr-field="wrk-health" value={v} defaultChecked={v==='Good'}/> {v}
                    </label>
                  ))}
                </div>
              </div>
            </BGrid>
          </BSection>
          <BSection title="📋 Documents & PPE Check">
            <BGrid>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Documents Required</div>
                {['Raw Material Sheet','Procedure Sheet'].map((d,i) => (
                  <TickRow key={d} id={`doc-${i}-${task.id}`} label={d} fieldKey={`doc-${i}`}/>
                ))}
                <div className="mt-2"><BField label="RM Remarks"><BInp type="text" data-bmr-field="rm-remarks" placeholder="Any remarks..." className="w-full"/></BField></div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">PPE Check</div>
                {['Protective Eye Glasses','Mask','Helmet','Rubber Gloves','Hand Mitts'].map((p,i) => (
                  <TickRow key={p} id={`ppe-${i}-${task.id}`} label={p} fieldKey={`ppe-${i}`}/>
                ))}
              </div>
            </BGrid>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <TickRow id={`maint-${task.id}`} label="Reactor Checked by Maintenance" fieldKey="maint-check"/>
              <BField label="Tools Used"><BInp type="text" data-bmr-field="tools-used" className="w-full"/></BField>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <BField label="Raw Water Qty (L)"><BInp type="number" data-bmr-field="raw-water-qty" step="0.1"/></BField>
              <BField label="DM Water Qty (L)"><BInp type="number" data-bmr-field="dm-water-qty" step="0.1"/></BField>
            </div>
          </BSection>
        </>
      )}

      {page === 1 && (
        <>
          <BSection title="🧹 Reactor Cleaning">
            <BGrid>
              <BField label="Cleaning Done"><BSel data-bmr-field="reactor-cleaning"><option>YES</option><option>NO</option></BSel></BField>
              <BField label="Previous Batch Product"><BInp type="text" data-bmr-field="prev-product"/></BField>
              <BField label="Previous Batch Date"><BInp type="date" data-bmr-field="prev-date"/></BField>
              <BField label="Previous Batch Quantity"><BInp type="text" data-bmr-field="prev-qty"/></BField>
              <BField label="Reactor Check by Maintenance"><BSel data-bmr-field="reactor-maint-check"><option>YES</option><option>NO</option></BSel></BField>
              <BField label="Maintenance Incharge"><BInp type="text" data-bmr-field="maint-incharge"/></BField>
            </BGrid>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[['Raw Water Cleaning','raw-water-clean'],['DM Water Cleaning','dm-water-clean'],['Steam Cleaning','steam-clean']].map(([l,k]) => (
                <TickRow key={k} id={`${k}-${task.id}`} label={l} fieldKey={k}/>
              ))}
            </div>
          </BSection>
          <BSection title="📦 Raw Material Received">
            <BGrid>
              <BField label="RM Received Date"><BInp type="date" data-bmr-field="rm-recv-date" defaultValue={todayVal}/></BField>
              <BField label="RM Received Time"><BInp type="time" data-bmr-field="rm-recv-time"/></BField>
            </BGrid>
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-[12px] text-blue-700">📎 Attach RM Sheet to this record</div>
          </BSection>
        </>
      )}

      {page === 2 && (
        <>
          <BSection title="🚀 Batch Start">
            <BGrid>
              <BField label="Batch Start Time"><BInp type="time" data-bmr-field="batch-start-time"/></BField>
              <BField label="Start Temperature (°C)"><BInp type="number" data-bmr-field="batch-start-temp" step="0.1"/></BField>
            </BGrid>
          </BSection>
          <BSection title="💧 DM Water Discharge">
            <BGrid cols={3}>
              <BField label="Start Time"><BInp type="time" data-bmr-field="dw-start-time"/></BField>
              <BField label="Start Temp (°C)"><BInp type="number" data-bmr-field="dw-start-temp" step="0.1"/></BField>
              <BField label="Start Meter Reading"><BInp type="text" data-bmr-field="dw-start-meter"/></BField>
              <BField label="End Time"><BInp type="time" data-bmr-field="dw-end-time"/></BField>
              <BField label="End Temp (°C)"><BInp type="number" data-bmr-field="dw-end-temp" step="0.1"/></BField>
              <BField label="End Meter Reading"><BInp type="text" data-bmr-field="dw-end-meter"/></BField>
            </BGrid>
            <div className="mt-3"><TickRow id={`wcc-${task.id}`} label="Checked for Water Contamination" fieldKey="water-contamination-check" checkedDefault={false}/></div>
          </BSection>
          <BSection title="🔥 Heating & ❄️ Cold Process">
            <BGrid>
              <div>
                <div className="text-[11px] font-bold text-gray-500 mb-2">Heating Process</div>
                <div className="grid gap-2">
                  <BField label="Present Temp (°C)"><BInp type="number" data-bmr-field="heat-present-temp" step="0.1"/></BField>
                  <BField label="Steam Start Temp (°C)"><BInp type="number" data-bmr-field="heat-steam-start" step="0.1"/></BField>
                  <BField label="Max Temp Reached (°C)"><BInp type="number" data-bmr-field="heat-max-temp" step="0.1"/></BField>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-gray-500 mb-2">Cold Process</div>
                <div className="grid gap-2">
                  <BField label="Present Temp (°C)"><BInp type="number" data-bmr-field="cold-present-temp" step="0.1"/></BField>
                  <BField label="Min Temp (°C)"><BInp type="number" data-bmr-field="cold-min-temp" step="0.1"/></BField>
                </div>
              </div>
            </BGrid>
          </BSection>
        </>
      )}

      {page === 3 && (
        <BSection title={`⚗️ Formulation Protocol — ${comps.filter(c=>!c.isHeader).length} component(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr className="bg-gray-50">
                {['Step','Raw Material','Quantity','Tick ✓','Seq.','Time Added','Temp (°C)','Remarks'].map(h => (
                  <th key={h} className="px-2 py-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>{buildProtocolRows(comps, task.id)}</tbody>
            </table>
          </div>
          <div className="mt-4 border-2 border-dashed border-amber-300 rounded-lg p-4 bg-amber-50">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">⚠ Deviation Record</div>
            <textarea data-bmr-field="deviation-record" rows={3} placeholder="Any deviation from standard process..."
              className="w-full px-3 py-2 border-[1.5px] border-amber-300 rounded-lg text-[13px] resize-vertical"/>
          </div>
        </BSection>
      )}

      {page === 4 && (
        <>
          <BSection title="🔒 Batch Close-Out">
            <BGrid>
              <BField label="Steam Close Time"><BInp type="time" data-bmr-field="steam-close-time"/></BField>
              <BField label="Steam Close Temp (°C)"><BInp type="number" data-bmr-field="steam-close-temp" step="0.1"/></BField>
              <BField label="Cooling Start Time"><BInp type="time" data-bmr-field="cooling-start-time"/></BField>
              <BField label="Cooling Close Temp (°C)"><BInp type="number" data-bmr-field="cooling-close-temp" step="0.1"/></BField>
              <BField label="Reactor Off Time"><BInp type="time" data-bmr-field="reactor-off-time"/></BField>
              <BField label="Switch-Off Temp (°C)"><BInp type="number" data-bmr-field="reactor-off-temp" step="0.1"/></BField>
              <BField label="No. of Samples Taken"><BInp type="number" data-bmr-field="samples-taken" min="0"/></BField>
              <BField label="Batch Comparison Notes"><BInp type="text" data-bmr-field="batch-comparison"/></BField>
            </BGrid>
          </BSection>
          <BSection title="🧪 QC Form">
            <BGrid>
              <BField label="Samples Sent to QC"><BSel data-bmr-field="qc-samples-sent"><option>YES</option><option>NO</option></BSel></BField>
              <BField label="Samples Sent Date & Time"><BInp type="datetime-local" data-bmr-field="qc-sent-datetime"/></BField>
            </BGrid>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[['Colour','qc-colour'],['Smell','qc-smell'],['Turbidity','qc-turbidity'],['pH','qc-ph'],['Specific Gravity','qc-spgr'],['Viscosity','qc-viscosity']].map(([l,k]) => (
                <BField key={k} label={l}><BInp type="text" data-bmr-field={k}/></BField>
              ))}
              <div className="col-span-3">
                <BField label="Active Ingredients">
                  <textarea data-bmr-field="qc-active-ingredients" rows={2}
                    className="w-full px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-[13px] resize-vertical focus:outline-none focus:border-blue-500"/>
                </BField>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr className="bg-gray-50">
                  <th className="p-2 border border-gray-200 text-[11px] text-gray-500">Condition</th>
                  {['12 Hours','24 Hours','48 Hours','72 Hours'].map(h => (
                    <th key={h} className="p-2 border border-gray-200 text-[11px] text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[['At Room Temp (RT)','stab-rt'],['At 4°C','stab-4c']].map(([l,k]) => (
                    <tr key={k}>
                      <td className="p-2 border border-gray-200 font-semibold text-[12.5px]">{l}</td>
                      {[0,1,2,3].map(i => (
                        <td key={i} className="p-1.5 border border-gray-200">
                          <BInp type="text" data-bmr-field={`${k}-${i}`} className="w-full"/>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BSection>
          <BSection title="✍️ Sign-Offs">
            <BGrid>
              <BField label="Supervisor Name"><BInp type="text" data-bmr-field="sign-supervisor"/></BField>
              <BField label="Checked By"><BInp type="text" data-bmr-field="sign-checked-by"/></BField>
              <BField label="Incharge Name"><BInp type="text" data-bmr-field="sign-incharge" defaultValue={task.incharge||''}/></BField>
              <BField label="Manager"><BInp type="text" data-bmr-field="sign-manager"/></BField>
            </BGrid>
          </BSection>
        </>
      )}
    </div>
  )
}
