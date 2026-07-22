export function BField({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </div>
  )
}
export function BInp(props) {
  return <input {...props} className={`px-2.5 py-1.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] font-[inherit] bg-white focus:outline-none focus:border-blue-500 transition ${props.className||''}`} />
}
export function BSel(props) {
  return <select {...props} className={`px-2.5 py-1.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] font-[inherit] bg-white focus:outline-none focus:border-blue-500 transition ${props.className||''}`} />
}
export function BSection({ title, children }) {
  return (
    <div className="px-7 py-5 border-b border-gray-100">
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">{title}</div>
      {children}
    </div>
  )
}
export function BGrid({ cols=2, children }) {
  const cls = cols===4 ? 'grid-cols-4' : cols===3 ? 'grid-cols-3' : 'grid-cols-2'
  return <div className={`grid ${cls} gap-3`}>{children}</div>
}
export function TickRow({ id, label, fieldKey, checkedDefault=true }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition mb-1.5">
      <input type="checkbox" data-bmr-field={fieldKey} defaultChecked={checkedDefault} id={id} className="w-4 h-4 cursor-pointer accent-green-600" />
      <label htmlFor={id} className="text-[12.5px] font-medium cursor-pointer flex-1">{label}</label>
    </div>
  )
}
