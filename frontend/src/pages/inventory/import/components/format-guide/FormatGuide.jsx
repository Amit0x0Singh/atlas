import { Building, FlaskConical, Wrench, Layers, GitBranch, Printer, ArrowDownToLine, Info, Pin } from 'lucide-react'

const SHEETS = [
  {
    sheet: 'Supplier Master',
    icon: Building,
    color: 'bg-pink-50 text-pink-600',
    match: 'Sheet name contains "supplier" or "vendor"',
    cols: [
      { name: 'Supplier Name', note: 'Required. Used as the unique key — existing suppliers (matched by name, case-insensitive) are updated instead of duplicated.' },
      { name: 'GSTIN', note: 'Optional.' },
      { name: 'Phone', note: 'Optional.' },
      { name: 'Email', note: 'Optional.' },
      { name: 'Address', note: 'Optional.' },
    ],
    note: null
  },
  {
    sheet: 'Product Master',
    icon: FlaskConical,
    color: 'bg-green-50 text-green-600',
    match: 'Sheet name contains "product" (not recipe/equipment)',
    cols: [
      { name: 'Product Name', note: 'Required. Duplicate names are skipped.' },
      { name: 'Plant Name', note: 'Optional. Plant(s) this product is made in — can list more than one.' },
    ],
    note: 'Product Code is auto-generated (PR00001, PR00002…) if not provided. UOM and State (Solid/Liquid/Gas) aren’t read from the sheet — set them afterward in Product Master.'
  },
  {
    sheet: 'Equipment Master',
    icon: Wrench,
    color: 'bg-blue-50 text-blue-600',
    match: 'Sheet name contains "equipment" or "equip"',
    cols: [
      { name: 'Equipment Name', note: 'Required. Unique name for each equipment.' },
      { name: 'Working Volume', note: 'Numeric. Capacity of the equipment (e.g. 500). Blank = 0.' },
      { name: 'Operation', note: 'Type of operation (e.g. Granulation, Blending).' },
      { name: 'Plant', note: 'Plant where this equipment is located.' },
    ],
    note: 'Equipment Code is always auto-generated (EP00001, EP00002…). Equipment Name is used as the unique key — existing records are updated. Designated Product and Working Unit (UOM) aren’t read from the sheet — set them afterward in Equipment Master.'
  },
  {
    sheet: 'RM Master',
    icon: Layers,
    color: 'bg-indigo-50 text-indigo-600',
    match: 'Sheet name contains "RM" or "Material" (not product/recipe)',
    cols: [
      { name: 'Item Code', note: 'Required. Unique RM code — used exactly as given, not auto-padded during import.' },
      { name: 'Item Name', note: 'Required. RM description.' },
      { name: 'UOM', note: 'Unit of measure (KG, L, etc.).' },
      { name: 'Category', note: 'Optional (e.g. "Raw Materials", "Consumables Consumed").' },
      { name: 'Sub Category', note: 'Optional (e.g. "Chemicals", "Herbal Extracts").' },
    ],
    note: 'State (Solid/Liquid/Gas) and Density (kg/L, for liquids) aren’t read from the sheet — set them afterward in Item Master.'
  },
  {
    sheet: 'Recipe / BOM',
    icon: GitBranch,
    color: 'bg-teal-50 text-teal-600',
    match: 'Sheet TAB name contains "recipe", "bom", or "formula" — OR auto-detected by columns',
    cols: [
      { name: 'Product Name', note: 'Required. Product (FG) this BOM belongs to.' },
      { name: 'Raw Material', note: 'Required. RM ingredient name.' },
      { name: 'Qty Per Unit', note: 'Required. Qty of RM per unit of product.' },
      { name: 'UOM', note: 'Unit of measure for the RM qty.' },
    ],
    note: 'Raw Materials MUST already exist in RM Master — the system matches by name (with fuzzy matching for minor spelling differences) but will NOT create new RM codes. Unmatched RMs are listed in the warnings. Products are auto-created if missing (getting a PR00001-style code), all under Recipe No. 1.'
  },
  {
    sheet: 'Print Master (Pack Stock)',
    icon: Printer,
    color: 'bg-violet-50 text-violet-600',
    match: 'Sheet name contains "print" or "pack master"',
    cols: [
      { name: 'Pack ID', note: 'Required. Unique ID for each bag/pack.' },
      { name: 'Item Code', note: 'Required. RM code this pack belongs to.' },
      { name: 'Lot No', note: 'Lot or batch code.' },
      { name: 'Pack Qty', note: 'Quantity in this pack.' },
      { name: 'Supplier', note: 'Optional.' },
      { name: 'Invoice No', note: 'Optional.' },
      { name: 'Status', note: 'Set "INWARDED" for stock already received.' },
    ],
    note: null
  },
  {
    sheet: 'Inward',
    icon: ArrowDownToLine,
    color: 'bg-orange-50 text-orange-600',
    match: 'Sheet name contains "inward" or "GRN" or "goods received"',
    cols: [
      { name: 'Pack ID', note: 'Required. Must already exist in Print Master.' },
      { name: 'Warehouse', note: 'Location where inward is done.' },
      { name: 'Date', note: 'Date of inward.' },
    ],
    note: null
  },
]

export default function FormatGuide() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden max-h-[calc(100vh-6.5rem)] overflow-y-auto">
      <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-100">
        <Pin size={15} className="text-gray-400" />
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Excel File Format Guide</h3>
          <p className="text-xs text-gray-500 mt-0.5">One Excel file can have multiple sheets — detected by sheet TAB name, filename, or column headers automatically</p>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {SHEETS.map(s => (
          <div key={s.sheet} className="px-6 py-5">
            <div className="flex items-start gap-3 mb-3">
              <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={16} />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-gray-900 block">{s.sheet}</span>
                <span className="text-xs text-gray-400">{s.match}</span>
              </div>
            </div>
            <div className="space-y-2 mb-3 pl-12">
              {s.cols.map(c => (
                <div key={c.name} className="text-xs">
                  <span className="font-semibold text-gray-600">{c.name}</span>
                  <span className="text-gray-400"> — {c.note}</span>
                </div>
              ))}
            </div>
            {s.note && (
              <div className="flex items-start gap-2 ml-12 bg-amber-50 ring-1 ring-inset ring-amber-100 px-3 py-2 rounded-lg">
                <Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">{s.note}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
