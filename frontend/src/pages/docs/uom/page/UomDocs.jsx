import { BookOpen, Scale, Beaker, Hash, Microscope, ArrowRightLeft, Info, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../../../../components/ui'

// ─── Reference data — mirrors backend/src/utils/uom.js & frontend/src/utils/uom.js
// (the alias tables every screen's actual conversion math runs on). Keep in
// sync if a unit is ever added/changed there.
const MASS_UNITS = [
  { unit: 'MT',  name: 'Metric Tonne', toKg: '1,000',        note: 'Bulk receipts — 1 MT = 1,000 KG' },
  { unit: 'KG',  name: 'Kilogram',     toKg: '1',             note: 'Canonical mass unit — every mass quantity is stored as KG', canon: true },
  { unit: 'GM / GMS', name: 'Gram',    toKg: '0.001',         note: '1,000 g = 1 KG' },
  { unit: 'MG',  name: 'Milligram',    toKg: '0.000001',      note: 'Trace/recipe-line dosages — 1,000,000 mg = 1 KG' },
  { unit: 'MCG / UG', name: 'Microgram', toKg: '0.000000001', note: 'Very small dosages (e.g. microbial/chemical trace additives) — 1,000 mcg = 1 mg' },
  { unit: 'NG',  name: 'Nanogram',     toKg: '0.000000000001', note: 'Smallest display tier — 1,000 ng = 1 mcg' },
]
const VOLUME_UNITS = [
  { unit: 'L / LT / LTR', name: 'Litre',   toL: '1',            note: 'Canonical volume unit — every volume quantity is stored as L', canon: true },
  { unit: 'ML',  name: 'Millilitre',   toL: '0.001',           note: '1,000 ml = 1 L' },
  { unit: 'MCL / UL', name: 'Microlitre', toL: '0.000001',     note: '1,000 mcl = 1 ml' },
  { unit: 'NL',  name: 'Nanolitre',    toL: '0.000000001',     note: 'Smallest display tier — 1,000 nl = 1 mcl' },
]
const COUNT_UNITS = [
  { unit: 'NOS', name: 'Numbers (count)', note: 'Canonical count unit — pouches, bottles, boxes, labels — a plain piece count', canon: true },
  { unit: 'PCS', name: 'Pieces',        note: 'Same as NOS — an alternate spelling some suppliers/invoices use' },
  { unit: 'BAG / BAGS', name: 'Bag',    note: 'Tracked as a count, same as NOS — a bag has no fixed weight of its own' },
  { unit: 'DRUM / DRUMS', name: 'Drum', note: 'Tracked as a count, same as NOS' },
]
const SPECIAL_UNITS = [
  {
    unit: 'CFU/g', name: 'Colony Forming Units per gram',
    desc: 'A microbiology potency reading — how many viable microorganism colonies are present per gram of material (e.g. "2 × 10⁹ CFU/g"). It is a concentration, not a quantity of stock, so it is never converted to KG/L/NOS and never added to or combined with any other quantity.',
  },
  {
    unit: '%w/w', name: 'Percent weight-by-weight',
    desc: 'A composition ratio — how much of a mixture\'s total weight one ingredient makes up. Also a ratio, not a stock quantity — never converted or combined with KG/L/NOS figures.',
  },
  {
    unit: '%v/v', name: 'Percent volume-by-volume',
    desc: 'Same idea as %w/w, for liquids — one component\'s share of the total volume. Never converted or combined with KG/L/NOS figures.',
  },
]

const SECTIONS = [
  { id: 'mass',       label: 'Mass',              tone: 'text-blue-600 hover:bg-blue-50' },
  { id: 'volume',     label: 'Volume',            tone: 'text-cyan-600 hover:bg-cyan-50' },
  { id: 'count',      label: 'Count',             tone: 'text-amber-600 hover:bg-amber-50' },
  { id: 'special',    label: 'Microbial & Ratios', tone: 'text-rose-600 hover:bg-rose-50' },
  { id: 'conversion', label: 'Conversion Factor', tone: 'text-indigo-600 hover:bg-indigo-50' },
]

function SectionCard({ id, icon: Icon, tone, title, subtitle, count, children }) {
  return (
    <div id={id} className="scroll-mt-20 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
        <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            {count != null && (
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{count}</span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function UnitTable({ rows, factorHeader }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100">
            <th className="px-1 py-2 w-28">Unit</th>
            <th className="px-1 py-2 w-32">Name</th>
            {factorHeader && <th className="px-1 py-2 w-32">{factorHeader}</th>}
            <th className="px-1 py-2">What it's for</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.unit} className={`border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/80 ${r.canon ? 'bg-indigo-50/40' : ''}`}>
              <td className="px-1 py-2.5">
                <span className={`inline-flex items-center gap-1 font-mono font-semibold text-xs px-2 py-1 rounded-md ${
                  r.canon ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {r.unit}
                </span>
              </td>
              <td className="px-1 py-2.5 text-gray-700">
                {r.name}
                {r.canon && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-indigo-500">Canonical</span>}
              </td>
              {factorHeader && <td className="px-1 py-2.5 font-mono text-xs text-gray-600 tabular-nums">{r.toKg || r.toL}</td>}
              <td className="px-1 py-2.5 text-gray-500 text-xs">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FormulaBox({ label, formula, tone }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold">{formula}</p>
    </div>
  )
}

function ExampleCard({ title, badge, badgeTone, inventoryUom, operationUom, factor, lines }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeTone}`}>{badge}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-500">
          <span>Inventory UOM: <strong className="text-gray-800">{inventoryUom}</strong></span>
          <span>Operation UOM: <strong className="text-gray-800">{operationUom}</strong></span>
          <span>Conversion Factor: <strong className="text-gray-800 font-mono">{factor}</strong></span>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <ArrowRightLeft size={13} className="text-indigo-400 shrink-0" />
              <span className="text-gray-700">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UomDocs() {
  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        icon={BookOpen}
        title="Units & Conversion Factor"
        description="What each unit abbreviation means, and how Conversion Factor works across the app"
      />

      {/* Quick nav — sticky so it's always reachable on a long page */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="w-full px-4 md:px-8 py-2.5 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 shrink-0 mr-1">Jump to</span>
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${s.tone}`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="w-full px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* Intro */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-bold">One place to store, another to issue</h1>
              <p className="mt-2 text-sm text-white/90 max-w-2xl">
                Every item in Item Master has an <strong>Inventory UOM</strong> (how it's stocked/weighed) and an{' '}
                <strong>Operation UOM</strong> (how it's issued/consumed on the floor). The database only ever stores
                quantities in three canonical units — everything else on this page is either a friendlier unit that
                scales to one of those three, or the <strong>Conversion Factor</strong> that bridges Inventory UOM
                and Operation UOM when they differ.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              {[['KG', 'Mass'], ['L', 'Volume'], ['NOS', 'Count']].map(([u, fam]) => (
                <div key={u} className="bg-white/15 rounded-xl px-4 py-3 text-center min-w-[84px]">
                  <p className="font-mono font-extrabold text-lg leading-none">{u}</p>
                  <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mt-1.5">{fam}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unit tables — 2-up on large screens so the page actually uses the width */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
          <SectionCard id="mass" icon={Scale} tone="bg-blue-50 text-blue-600" title="Mass units" subtitle="Everything scales to the canonical unit KG" count={MASS_UNITS.length}>
            <UnitTable rows={MASS_UNITS} factorHeader="= this many KG" />
          </SectionCard>

          <SectionCard id="volume" icon={Beaker} tone="bg-cyan-50 text-cyan-600" title="Volume units" subtitle="Everything scales to the canonical unit L" count={VOLUME_UNITS.length}>
            <UnitTable rows={VOLUME_UNITS} factorHeader="= this many L" />
          </SectionCard>

          <SectionCard id="count" icon={Hash} tone="bg-amber-50 text-amber-600" title="Count units" subtitle="A plain piece count — no weight/volume of its own" count={COUNT_UNITS.length}>
            <UnitTable rows={COUNT_UNITS} />
          </SectionCard>

          <SectionCard id="special" icon={Microscope} tone="bg-rose-50 text-rose-600" title="Microbial & composition units" subtitle="Never converted, never combined with KG / L / NOS quantities" count={SPECIAL_UNITS.length}>
            <div className="space-y-3">
              {SPECIAL_UNITS.map(s => (
                <div key={s.unit} className="flex gap-3">
                  <span className="shrink-0 bg-rose-50 text-rose-700 font-mono font-semibold text-xs px-2 py-1 rounded-md h-fit">{s.unit}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Conversion Factor — full width, the most important section */}
        <SectionCard id="conversion" icon={ArrowRightLeft} tone="bg-indigo-50 text-indigo-600" title="What is Conversion Factor?" subtitle="How Inventory UOM and Operation UOM are reconciled">
          <div className="space-y-5">
            <p className="text-sm text-gray-600 max-w-3xl">
              <strong>Conversion Factor</strong> is a <em>generic</em> ratio — it is <strong>not</strong> specifically
              density, even though it happens to equal density for a liquid. It answers one question:{' '}
              <strong>"how much Inventory UOM does one unit of Operation UOM weigh/measure?"</strong> That same rule
              covers a liquid stocked in KG but issued in L (where the factor is its density, KG per L) just as well
              as a packing item stocked in KG but issued in NOS (where the factor is one piece's weight, KG per NOS).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <FormulaBox
                label="Operation → Inventory"
                formula="Inventory Qty = Operation Qty × Conversion Factor"
                tone="bg-indigo-50 border-indigo-100 text-indigo-800"
              />
              <FormulaBox
                label="Inventory → Operation"
                formula="Operation Qty = Inventory Qty ÷ Conversion Factor"
                tone="bg-violet-50 border-violet-100 text-violet-800"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <ExampleCard
                title="Clove Leaf Oil"
                badge="Liquid — density"
                badgeTone="bg-cyan-50 text-cyan-700"
                inventoryUom="KG"
                operationUom="L"
                factor="1.03 KG/L"
                lines={[
                  'Issue 10 L  →  10 × 1.03 = 10.3 KG deducted from stock.',
                  '9.1 KG in stock  →  9.1 ÷ 1.03 ≈ 8.83 L available to issue.',
                ]}
              />
              <ExampleCard
                title="Bilaminated Pouch"
                badge="Packing material — unit weight"
                badgeTone="bg-amber-50 text-amber-700"
                inventoryUom="KG"
                operationUom="NOS"
                factor="0.003571 KG/NOS"
                lines={[
                  'Issue 100 NOS  →  100 × 0.003571 = 0.3571 KG deducted from stock.',
                  'Issue 500 NOS  →  500 × 0.003571 = 1.7855 KG deducted from stock.',
                  '1 KG in stock  →  1 ÷ 0.003571 ≈ 280 NOS available to issue.',
                ]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2.5">Ground rules</p>
                <ul className="space-y-2 text-xs text-gray-600">
                  {[
                    'Inventory UOM and Operation UOM the same? No conversion is applied — the number passes through unchanged.',
                    <><strong>Conversion Required = No</strong> — the Conversion Factor is ignored even if a value is set.</>,
                    <><strong>Conversion Required = Yes</strong> with a missing or non-positive factor — the system blocks the stock transaction rather than guessing or defaulting to zero.</>,
                    'Set it once in Item Master and every screen that moves stock uses the exact same calculation.',
                  ].map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2.5">Where it applies</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Stock Loss Adjustment', 'Material Issue by BOM', 'Open Indents', 'Warehouse ⇄ Container', 'Direct Issue', 'Ledger', 'Reports'].map(p => (
                    <span key={p} className="text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1">{p}</span>
                  ))}
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-400 mt-3">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Sub-unit display tiers (mg / g / kg, ml / L) are pure unit scaling, shown to make small quantities
                    easier to key in — they never need a Conversion Factor.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
