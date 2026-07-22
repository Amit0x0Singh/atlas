import { BInp } from './BFormFields.jsx'

export function buildProtocolRows(comps, taskId) {
  if (!comps.length) {
    return Array.from({length:20},(_,i) => (
      <tr key={i} className="border-b border-gray-100">
        <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-400 w-10">{i+1}</td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`p-rm-${i}`} className="w-full"/></td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`p-qty-${i}`} className="w-24 text-center"/></td>
        <td className="px-2 py-1.5 text-center"><input type="checkbox" data-bmr-field={`p-tick-${i}`} className="w-4 h-4 accent-green-600"/></td>
        <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`p-seq-${i}`} className="w-16 text-center"/></td>
        <td className="px-2 py-1.5"><BInp type="time" data-bmr-field={`p-time-${i}`} className="w-28"/></td>
        <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`p-temp-${i}`} step="0.1" className="w-20 text-center"/></td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`p-rem-${i}`} className="w-full"/></td>
      </tr>
    ))
  }
  const rows = []; let idx = 0
  comps.forEach(c => {
    if (c.isHeader) {
      rows.push(<tr key={`h-${idx}`} className="bg-blue-50"><td colSpan={8} className="px-3 py-1.5 text-[12px] font-bold italic text-blue-700">▸ {c.component}</td></tr>)
    } else {
      const i = idx++
      rows.push(
        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-400 w-10">{i+1}</td>
          <td className="px-2 py-1.5 font-medium text-[12.5px]">{c.component}</td>
          <td className="px-2 py-1.5 font-mono text-[12px] text-blue-700 text-center">{c.qty||''} {c.uom||''}</td>
          <td className="px-2 py-1.5 text-center"><input type="checkbox" data-bmr-field={`p-tick-${i}`} className="w-4 h-4 accent-green-600"/></td>
          <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`p-seq-${i}`} className="w-16 text-center"/></td>
          <td className="px-2 py-1.5"><BInp type="time" data-bmr-field={`p-time-${i}`} className="w-28"/></td>
          <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`p-temp-${i}`} step="0.1" className="w-20 text-center"/></td>
          <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`p-rem-${i}`} className="w-full"/></td>
        </tr>
      )
    }
  })
  return rows
}

export function buildFormulationRows(comps) {
  if (!comps.length) {
    return Array.from({length:15},(_,i) => (
      <tr key={i} className="border-b border-gray-100">
        <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-400 w-10">{i+1}</td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`f-rm-${i}`} className="w-full"/></td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`f-qty-${i}`} className="w-28"/></td>
        <td className="px-2 py-1.5 text-center"><input type="checkbox" data-bmr-field={`f-tick-${i}`} className="w-4 h-4 accent-green-600"/></td>
        <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`f-seq-${i}`} className="w-16 text-center"/></td>
        <td className="px-2 py-1.5"><BInp type="time" data-bmr-field={`f-time-${i}`} className="w-28"/></td>
        <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`f-rem-${i}`} className="w-full"/></td>
      </tr>
    ))
  }
  const rows = []; let idx = 0
  comps.forEach(c => {
    if (c.isHeader) {
      rows.push(<tr key={`h-${idx}`} className="bg-blue-50"><td colSpan={7} className="px-3 py-1.5 text-[12px] font-bold italic text-blue-700">▸ {c.component}</td></tr>)
    } else {
      const i = idx++
      rows.push(
        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-400 w-10">{i+1}</td>
          <td className="px-2 py-1.5 font-medium text-[12.5px]">{c.component}</td>
          <td className="px-2 py-1.5 font-mono text-[12px] text-blue-700">{c.qty||''} {c.uom||''}</td>
          <td className="px-2 py-1.5 text-center"><input type="checkbox" data-bmr-field={`f-tick-${i}`} className="w-4 h-4 accent-green-600"/></td>
          <td className="px-2 py-1.5"><BInp type="number" data-bmr-field={`f-seq-${i}`} className="w-16 text-center"/></td>
          <td className="px-2 py-1.5"><BInp type="time" data-bmr-field={`f-time-${i}`} className="w-28"/></td>
          <td className="px-2 py-1.5"><BInp type="text" data-bmr-field={`f-rem-${i}`} className="w-full"/></td>
        </tr>
      )
    }
  })
  return rows
}
