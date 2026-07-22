const STEPS = [
  ['1. Create Location', 'Create a location ID (LOC-001) for a shelf/rack assigned to one bulk item'],
  ['2. Print & Affix QR', 'Print the location QR label and stick it on the physical rack/shelf'],
  ['3. Bulk Inward',      'Go to Inward → Bulk tab → scan location QR → enter lot details (supplier, qty)'],
  ['4. Bulk Outward',     'Go to Outward → scan location QR → see all lots → select which lot → issue qty'],
]

export default function WorkflowInfoCard() {
  return (
    <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
      <p className="font-semibold mb-1">📦 Bulk Tracking Workflow</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs mt-2">
        {STEPS.map(([title, desc]) => (
          <div key={title} className="bg-white border border-emerald-100 rounded-lg px-3 py-2">
            <p className="font-semibold text-emerald-700">{title}</p>
            <p className="text-gray-600 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
