import { Fragment } from 'react'
import { packsApi } from '../../../../../../../api/inventory.js'
import { openAuthedFile } from '../../../../../../../utils/authedFile.js'
import { fmtDate } from '../utils/groupPacks.js'

import { toTitleCase } from '../../../../../../../utils/textDisplay.js'
export default function HistoryRow({ group: g, isOpen, onToggle }) {
  const totalQty        = g.bags.reduce((s, b) => s + (b.packQty || 0), 0)
  const groupWarehouses = [...new Set(g.bags.map(b => b.warehouse).filter(Boolean))]

  return (
    <Fragment>
      {/* Main group row */}
      <tr
        onClick={onToggle}
        className={`border-t border-gray-200 cursor-pointer select-none transition-colors ${
          isOpen ? 'bg-blue-50 hover:bg-blue-100/60' : 'hover:bg-gray-50'
        }`}>
        <td className="px-3 py-3 text-center text-gray-400 text-xs">
          {isOpen ? '-' : '-'}
        </td>

        <td className="px-3 py-3">
          <div className="font-semibold text-gray-900">{toTitleCase(g.itemName)}</div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">{g.itemCode}</div>
        </td>

        <td className="px-3 py-3">
          <div className="font-mono text-xs font-semibold text-gray-700">{g.lotNo || '—'}</div>
          {g.invoiceNo && (
            <div className="text-xs text-gray-400 mt-0.5">Inv: {g.invoiceNo}</div>
          )}
        </td>

        <td className="px-3 py-3 text-sm text-gray-600">{g.supplier || '—'}</td>

        <td className="px-3 py-3 text-center">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {g.bags.length}
          </span>
        </td>

        <td className="px-3 py-3 font-semibold text-gray-800">
          {totalQty % 1 === 0 ? totalQty : totalQty.toFixed(3)}{' '}
          <span className="text-gray-400 font-normal text-xs">{g.uom}</span>
        </td>

        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
          {fmtDate(g.receivedDate)}
        </td>

        <td className="px-3 py-3">
          {groupWarehouses.length === 0 ? (
            <span className="text-gray-300 text-xs">—</span>
          ) : groupWarehouses.length === 1 ? (
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {groupWarehouses[0]}
            </span>
          ) : (
            <span className="text-xs text-indigo-600 font-medium" title={groupWarehouses.join(', ')}>
              {groupWarehouses.length} locations
            </span>
          )}
        </td>

        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openAuthedFile(packsApi.batchLabelsUrl(g.itemCode, g.lotNo)).catch(e => alert(`Print failed: ${e.message}`))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition whitespace-nowrap"
          >Print All ({g.bags.length})
          </button>
        </td>
      </tr>

      {/* Bag sub-rows */}
      {isOpen && g.bags.map(b => (
        <tr key={b.packId} className="bg-blue-50/30 border-t border-blue-100/60">
          <td colSpan={9} className="px-0 py-0">
            <div className="flex items-center pl-8 pr-3 py-2 gap-0">
              <div className="w-px h-8 bg-blue-300 mr-4 shrink-0" />
              <span className="text-xs text-gray-400 w-16 shrink-0">
                Bag{' '}
                <span className="font-mono font-bold text-gray-700">
                  #{String(b.bagNo).padStart(3, '0')}
                </span>
              </span>
              <span className="font-mono text-xs text-blue-700 font-semibold flex-1 min-w-0 truncate mx-4">
                {b.packId}
              </span>
              <span className="text-xs text-gray-700 w-20 shrink-0">
                {b.packQty} {b.uom}
              </span>
              {b.warehouse ? (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded w-36 text-center shrink-0 truncate">
                {toTitleCase(b.warehouse)}
                </span>
              ) : (
                <span className="text-xs text-gray-300 w-36 text-center shrink-0">—</span>
              )}
              <button
                type="button"
                onClick={() => openAuthedFile(packsApi.labelUrl(b.packId)).catch(e => alert(`Print failed: ${e.message}`))}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-4 shrink-0 whitespace-nowrap"
              >
               Label
              </button>
            </div>
          </td>
        </tr>
      ))}
    </Fragment>
  )
}
