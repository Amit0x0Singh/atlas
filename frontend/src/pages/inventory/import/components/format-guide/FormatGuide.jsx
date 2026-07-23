import { useState } from 'react'
import { Building, Microscope, FlaskConical, Wrench, Layers, GitBranch, Printer, ArrowDownToLine, Info, ChevronDown } from 'lucide-react'

const BADGE = {
  Required:  'bg-red-50 text-red-600 ring-red-100',
  Optional:  'bg-gray-100 text-gray-500 ring-gray-200',
  'Auto-generated': 'bg-blue-50 text-blue-600 ring-blue-100',
}

function ColBadge({ kind }) {
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 ring-inset ${BADGE[kind]}`}>{kind}</span>
}

const SHEETS = [
  {
    sheet: 'Supplier Master',
    icon: Building,
    color: 'bg-pink-50 text-pink-600',
    match: 'Sheet name contains "supplier" or "vendor"',
    cols: [
      { name: 'Supplier Name', kind: 'Required' },
      { name: 'GSTIN', kind: 'Optional' },
      { name: 'Phone', kind: 'Optional' },
      { name: 'Email', kind: 'Optional' },
      { name: 'Address', kind: 'Optional' },
    ],
    behavior: 'Existing suppliers are matched by name (case-insensitive) and updated instead of duplicated.',
  },
  {
    sheet: 'Microbe Master',
    icon: Microscope,
    color: 'bg-purple-50 text-purple-600',
    match: 'Sheet name contains "microbe"',
    cols: [
      { name: 'Microbe (or Microbe Name)', kind: 'Required' },
      { name: 'UOM', kind: 'Optional' },
      { name: 'Microbe Code', kind: 'Auto-generated' },
    ],
    behavior: 'Microbe Code is always generated automatically (mc00001, mc00002…) — never read from the sheet, even if one is present. Existing microbes are matched by name (case-insensitive) and just get their UOM refreshed. UOM defaults to KG if left blank.',
  },
  {
    sheet: 'Product Master',
    icon: FlaskConical,
    color: 'bg-green-50 text-green-600',
    match: 'Sheet name contains "product" (not recipe/equipment)',
    cols: [
      { name: 'Product Name', kind: 'Required' },
      { name: 'Plant Name', kind: 'Optional' },
      { name: 'Product Code', kind: 'Auto-generated' },
    ],
    behavior: 'Product Code is generated automatically (PR00001, PR00002…) when not provided. Duplicate product names are skipped, not re-created.',
    note: 'UOM and State (Solid/Liquid/Gas) aren’t read from the sheet — set them afterward in Product Master.',
  },
  {
    sheet: 'Equipment Master',
    icon: Wrench,
    color: 'bg-blue-50 text-blue-600',
    match: 'Sheet name contains "equipment" or "equip"',
    cols: [
      { name: 'Equipment Name', kind: 'Required' },
      { name: 'Working Volume', kind: 'Optional' },
      { name: 'Operation', kind: 'Optional' },
      { name: 'Plant', kind: 'Optional' },
      { name: 'Equip Code', kind: 'Auto-generated' },
    ],
    behavior: 'Equip Code is always generated automatically (EP00001, EP00002…). Equipment Name is the unique key — existing records are updated, not duplicated. A unit inlined in Working Volume (e.g. "50 Kg") is split out automatically.',
    note: 'Designated Product and Working Unit aren’t read from the sheet — set them afterward in Equipment Master.',
  },
  {
    sheet: 'RM Master',
    icon: Layers,
    color: 'bg-indigo-50 text-indigo-600',
    match: 'Sheet name contains "RM" or "Material" (not product/recipe)',
    cols: [
      { name: 'Item Code', kind: 'Required' },
      { name: 'Item Name', kind: 'Required' },
      { name: 'UOM', kind: 'Optional' },
      { name: 'Category', kind: 'Optional' },
      { name: 'Sub Category', kind: 'Optional' },
    ],
    behavior: 'Item Code is used exactly as given — not auto-padded during import. UOM defaults to KG if left blank.',
    note: 'State (Solid/Liquid/Gas) and Density (kg/L, for liquids) aren’t read from the sheet — set them afterward in Item Master.',
  },
  {
    sheet: 'Recipe / BOM',
    icon: GitBranch,
    color: 'bg-teal-50 text-teal-600',
    match: 'Sheet TAB name contains "recipe", "bom", or "formula" — or auto-detected by columns',
    cols: [
      { name: 'Product Name', kind: 'Required' },
      { name: 'Raw Material', kind: 'Required' },
      { name: 'Qty Per Unit', kind: 'Optional' },
      { name: 'UOM', kind: 'Optional' },
    ],
    behavior: 'Raw Materials must already exist in RM Master (matched by name, with fuzzy matching for minor spelling differences) — unmatched ones are imported anyway with a placeholder "NaN" code, listed in the warnings. Products are auto-created if missing. Blank Qty/UOM don’t drop the row — qty floors to 0 and UOM becomes "NaN" as a visible flag to fix later.',
  },
  {
    sheet: 'Print Master (Pack Stock)',
    icon: Printer,
    color: 'bg-violet-50 text-violet-600',
    match: 'Sheet name contains "print" or "pack master"',
    cols: [
      { name: 'Pack ID', kind: 'Required' },
      { name: 'Item Code', kind: 'Required' },
      { name: 'Lot No', kind: 'Optional' },
      { name: 'Pack Qty', kind: 'Optional' },
      { name: 'Supplier', kind: 'Optional' },
      { name: 'Invoice No', kind: 'Optional' },
      { name: 'Status', kind: 'Optional' },
    ],
    behavior: 'Set Status to "INWARDED" for stock that’s already been received.',
  },
  {
    sheet: 'Inward',
    icon: ArrowDownToLine,
    color: 'bg-orange-50 text-orange-600',
    match: 'Sheet name contains "inward" or "GRN" or "goods received"',
    cols: [
      { name: 'Pack ID', kind: 'Required' },
      { name: 'Warehouse', kind: 'Optional' },
      { name: 'Date', kind: 'Optional' },
    ],
    behavior: 'Pack ID must already exist in Print Master.',
  },
]

function GuideSection({ s, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
          <s.icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-gray-900 block">{s.sheet}</span>
          <span className="text-xs text-gray-400">{s.match}</span>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-5 pl-[4.5rem]">
          <div className="space-y-1.5 mb-3">
            {s.cols.map(c => (
              <div key={c.name} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-gray-700">{c.name}</span>
                <ColBadge kind={c.kind} />
              </div>
            ))}
          </div>
          {s.behavior && (
            <div className="flex items-start gap-2 bg-blue-50 ring-1 ring-inset ring-blue-100 px-3 py-2 rounded-lg mb-2">
              <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">{s.behavior}</p>
            </div>
          )}
          {s.note && (
            <div className="flex items-start gap-2 bg-amber-50 ring-1 ring-inset ring-amber-100 px-3 py-2 rounded-lg">
              <Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">{s.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FormatGuide() {
  const [openSheet, setOpenSheet] = useState(SHEETS[0].sheet)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden max-h-[calc(100vh-6.5rem)] overflow-y-auto">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">Excel File Format Guide</h3>
        <p className="text-xs text-gray-500 mt-0.5">Sheet names and columns are detected automatically.</p>
      </div>
      <div>
        {SHEETS.map(s => (
          <GuideSection
            key={s.sheet}
            s={s}
            isOpen={openSheet === s.sheet}
            onToggle={() => setOpenSheet(openSheet === s.sheet ? null : s.sheet)}
          />
        ))}
      </div>
    </div>
  )
}
