import { PartyPopper, PackageCheck } from 'lucide-react'
import { Button } from '../../../../../../../components/ui'
import { toTitleCase } from '../../../../../../../utils/textDisplay.js'

export default function DoneStep({ doneStats, selected, onBack }) {
  return (
    <div className="p-4 md:p-6 max-w-xl">
      {doneStats.leftOver > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <PackageCheck size={48} className="mx-auto mb-4 text-blue-600" />
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Partial Inward Submitted</h2>
          <p className="text-blue-700 mb-1">
            <span className="font-bold">{doneStats.submitted} bag{doneStats.submitted !== 1 ? 's' : ''}</span> successfully inwarded
          </p>
          <p className="text-blue-600 text-sm mb-3">Item: {toTitleCase(selected?.itemName)} | Lot: {selected?.lotNo}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
            ⏳ <span className="font-semibold">{doneStats.leftOver} bag{doneStats.leftOver !== 1 ? 's' : ''} still pending</span> — come back tomorrow and start a new session to scan the rest.
          </div>
          <Button onClick={onBack} variant="primary">Back to Setup</Button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <PartyPopper size={48} className="mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Pack Inward Completed!</h2>
          <p className="text-green-700 mb-1">{doneStats.submitted} bags successfully inwarded</p>
          <p className="text-green-600 text-sm mb-6">Item: {toTitleCase(selected?.itemName)} | Lot: {selected?.lotNo}</p>
          <Button onClick={onBack} variant="success">Start New Inward</Button>
        </div>
      )}
    </div>
  )
}
