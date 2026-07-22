import { Field } from './FormFields.jsx'
import AutocompleteInput from './AutocompleteInput.jsx'
import { planTasksApi } from '../../../../../../api/production.js'

export default function DiPickerSection({
  diNo, onDiNoChange, onDiSelect,
  diItems, loadingDiItems, onPickDiItem,
  packingInfo,
}) {
  return (
    <>
      <Field label="DI Number" hint="Type to search sales orders">
        <AutocompleteInput
          value={diNo}
          onChange={onDiNoChange}
          onSelect={onDiSelect}
          fetchFn={q => planTasksApi.searchSalesOrders(q)}
          placeholder="e.g. LT-26-018"
          renderOption={so => (
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="font-semibold text-blue-700">{so.diNumber}</span>
              {so.sectionName && (
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase">
                  {so.sectionName}
                </span>
              )}
              <span className="text-gray-600 text-[12px]">{so.productName}</span>
              {so.customerName && <span className="text-gray-400 text-[11px]">— {so.customerName}</span>}
              {so.orderQty && <span className="text-gray-400 text-[11px]">({so.orderQty} {so.qtyUnit})</span>}
            </div>
          )}
        />
      </Field>

      {/* DI product picker — shown when a DI with multiple products is selected */}
      {(loadingDiItems || diItems.length > 0) && (
        <div className="mt-2 mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">
            {loadingDiItems ? 'Loading products…' : `Select product from DI ${diNo}`}
          </div>
          {!loadingDiItems && (
            <div className="flex flex-col gap-1.5">
              {diItems.map((item, i) => (
                <button key={i} type="button"
                  onClick={() => onPickDiItem(item)}
                  className="w-full text-left px-3 py-2.5 bg-white border-[1.5px] border-gray-200 rounded-lg
                    hover:border-blue-500 hover:bg-blue-50 transition text-sm flex items-center justify-between group">
                  <span className="font-medium text-gray-800 group-hover:text-blue-700">{item.productName}</span>
                  {item.orderQty != null && (
                    <span className="text-gray-400 text-[12px] shrink-0 ml-2">
                      {item.orderQty} {item.qtyUnit}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Packing info banner — shown after a product is chosen from a DI */}
      {packingInfo !== null && !loadingDiItems && diItems.length === 0 && (
        <div className={`mt-2 mb-3 rounded-xl border px-4 py-3 ${
          (packingInfo.primaryPack || packingInfo.secondaryPack || packingInfo.unitPackQty)
            ? 'border-green-200 bg-green-50'
            : 'border-amber-200 bg-amber-50'
        }`}>
          {(packingInfo.primaryPack || packingInfo.secondaryPack || packingInfo.unitPackQty) ? (
            <>
              <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1.5">
                Packing details auto-filled from sales order
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-green-800">
                {packingInfo.primaryPack   && <span>Primary: <strong>{packingInfo.primaryPack}</strong></span>}
                {packingInfo.unitPackQty   && <span>Unit pack: <strong>{packingInfo.unitPackQty} kg</strong></span>}
                {packingInfo.secondaryPack && <span>Secondary: <strong>{packingInfo.secondaryPack}</strong></span>}
                {packingInfo.labelType     && <span>Label: <strong>{packingInfo.labelType}</strong></span>}
              </div>
            </>
          ) : (
            <div className="text-[12px] text-amber-800">
              <span className="font-semibold">No packing details in sales order.</span>
              <span className="ml-1 text-amber-700">Packing materials are available in the company — please coordinate with the packaging team.</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}
