export function Field({ label, children, span }) {
  return (
    <div className={span ? 'col-span-full' : ''}>
      <label className="text-[11px] font-semibold text-slate-500 block mb-1">{label}</label>
      {children}
    </div>
  )
}

export function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[13.5px] font-bold text-slate-800 leading-tight">{title}</p>
        {description && <p className="text-[11.5px] text-slate-400 leading-tight">{description}</p>}
      </div>
    </div>
  )
}

// Base styling without a width utility — combine with an explicit width class
// at each use site instead of appending one after inputCls, since Tailwind's
// generated stylesheet order (not className order) decides which width wins
// when two width utilities are combined.
export const inputBaseCls = 'border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none transition-colors focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white'
export const inputCls = `w-full ${inputBaseCls}`
