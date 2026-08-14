import { Button } from '../../../../../components/ui'

import { toTitleCase } from '../../../../../utils/textDisplay.js'
export default function StockShortfallModal({ shortfallItems, creating, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100 text-red-600 rounded-full p-2">s️</div>
          <h2 className="text-lg font-bold text-red-700">Insufficient Stock Warning</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          The following RMs do not have sufficient stock. The indent will be created as{' '}
          <strong className="text-red-600">PENDING STOCK</strong> and auto-activates when the missing materials are inwarded.
        </p>
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 space-y-2">
          {shortfallItems.map(c => (
            <div key={c.rmCode} className="text-sm">
              <div className="font-semibold text-red-700">{toTitleCase(c.rmName)} <span className="font-mono text-xs text-red-400">[{c.rmCode}]</span></div>
              <div className="text-xs text-red-600 flex gap-4 mt-0.5">
                <span>Required: <strong>{Number(c.required || c.requiredQty).toFixed(3)}</strong></span>
                <span>Available: <strong>{Number(c.available || c.availableQty).toFixed(3)}</strong></span>
                <span className="font-bold">Short: {Number(c.shortfall).toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="warning" fullWidth loading={creating} onClick={onConfirm}>
            {creating ? 'Creating...' : 'Create as PENDING STOCK'}
          </Button>
          <Button variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
