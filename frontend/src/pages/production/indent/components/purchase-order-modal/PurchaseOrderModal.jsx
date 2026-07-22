import { Button, IconButton } from '../../../../../components/ui'
import { X } from 'lucide-react'

export default function PurchaseOrderModal({
  onClose, generatePO,
  emailTo, setEmailTo, emailCc, setEmailCc,
  emailSaved, saveEmailDefaults, sendEmail,
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">Y"" Purchase Requisition</h2>
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>
        <div className="px-6 py-4 space-y-4">
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {generatePO()}
          </pre>
          <div className="border border-indigo-200 rounded-xl overflow-hidden">
            <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200">
              <p className="text-sm font-semibold text-indigo-800">o?️ Send via Email</p>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To *</label>
                  <input type="email" placeholder="purchase@company.com" value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CC</label>
                  <input type="email" placeholder="manager@company.com" value={emailCc}
                    onChange={e => setEmailCc(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Button variant="outline-gray" size="xs" onClick={saveEmailDefaults}>
                  {emailSaved ? 'Saved!' : 'Save as Default'}
                </Button>
              </div>
              <Button variant="primary" fullWidth disabled={!emailTo.trim()} onClick={sendEmail}>
                Open in Email App &amp; Send
              </Button>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => navigator.clipboard?.writeText(generatePO())}>
            Copy to Clipboard
          </Button>
          <Button variant="outline-gray" fullWidth onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
