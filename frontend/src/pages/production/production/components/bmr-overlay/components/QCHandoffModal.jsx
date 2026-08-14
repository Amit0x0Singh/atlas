import { useState } from 'react'
import { planTasksApi } from '../../../../../../api/production.js'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'

export default function QCHandoffModal({ task, bmrData, sfgCreated, onClose }) {
  const [remarks, setRemarks] = useState('')
  const finalQty = sfgCreated
    ? sfgCreated.qty
    : (parseFloat(bmrData['total-qty-packed']) || parseFloat(bmrData['total-qty']) || task.qty)
  const storedWhere = sfgCreated
    ? `SFG — ${toTitleCase(sfgCreated.location)}`
    : (task.process === 'Packing' ? 'Packed & ready for dispatch' : toTitleCase(task.location) || '—')

  async function confirmSend() {
    const qcQueue = (() => { try { return JSON.parse(localStorage.getItem('erp_qc_queue'))||[] } catch { return [] } })()
    const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5)
    qcQueue.push({ id: id(), taskId:task.id, productName:toTitleCase(task.productName), batchCode:task.batchCode,
      diNo:task.diNo, plant:task.plant, qty:task.qty, qtyUom:task.qtyUom,
      remarks, sentAt:new Date().toISOString(), qcStatus:'Pending' })
    localStorage.setItem('erp_qc_queue', JSON.stringify(qcQueue))
    try {
      await planTasksApi.update(task.id, { sentToQc: true, sentToQcAt: new Date().toISOString() })
    } catch { /* best-effort */ }
    onClose('sent')
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/50">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bo-qc-header">
          <div className="text-base font-bold">🧪 Send to QC</div>
          <div className="text-[12.5px] opacity-80 mt-0.5">Batch signed off — confirm before sending to QC</div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[['Product',toTitleCase(task.productName)],['Batch No',task.batchCode||'—'],['DI Number',task.diNo||'—'],['Plant',task.plant],['Qty',`${finalQty} ${task.qtyUom||'kg'}`],['Stored At',storedWhere]].map(([l,v]) => (
              <div key={l}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{l}</div>
                <div className="font-semibold text-[13.5px]">{v}</div>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarks for QC (optional)</label>
            <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] resize-vertical focus:outline-none focus:border-blue-400"/>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => onClose('skip')} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold hover:bg-gray-50">Skip for now</button>
            <button onClick={confirmSend} className="px-5 py-2 rounded-lg text-[13px] font-bold text-white bo-qc-send-btn">✓ Send to QC</button>
          </div>
        </div>
      </div>
    </div>
  )
}
