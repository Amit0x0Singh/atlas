export default function BomIssuanceTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="bg-white border-b border-slate-200 flex px-6 overflow-x-auto flex-shrink-0 gap-1">
      {tabs.map(t => {
        const Icon = t.icon
        const active = activeTab === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors
              ${active ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-200'}`}>
            <Icon size={14.5} />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
