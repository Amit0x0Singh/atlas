import { useEffect, useState } from 'react'
import { DSection, DRow } from '../detail-modal/DetailModal.jsx'
import { Modal, IconButton } from '../../../../../../components/ui'
import { X, Clock, Package, Warehouse, ClipboardList, FlaskConical } from 'lucide-react'
import './TransactionDetailModal.css'

import { toTitleCase } from '../../../../../../utils/textDisplay.js'
import { useUserDisplayNames } from '../../../../../../hooks/masters/useUserDisplayNames.js'
export default function TransactionDetailModal({ detail, onClose }) {
  // Resolve the createdBy email to a readable name, same as the Stock Ledger
  // table's Created By / Updated By columns.
  const displayName = useUserDisplayNames()
  // Keep rendering the last non-null detail while Modal fades out — `detail`
  // itself goes null the instant the parent starts closing, and rendering
  // nothing at that point would leave an empty white panel visible for the
  // remainder of the close animation.
  const [shown, setShown] = useState(detail)
  useEffect(() => { if (detail) setShown(detail) }, [detail])

  return (
    <Modal open={!!detail} onClose={onClose} size="xl">
      {shown && (
        <>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-gray-900">Transaction Detail</h2>
            <IconButton icon={X} onClick={onClose} variant="ghost" size="sm" tooltip="Close" />
          </div>

          <div className="px-4 py-3 space-y-2.5 max-h-[75vh] overflow-y-auto text-[13px]">
            {shown.loading ? (
              <p className="text-gray-400">Loading details...</p>
            ) : shown.error ? (
              <p className="text-red-500">{shown.error}</p>
            ) : (
              <>
                <DSection icon={Clock} title="Transaction">
                  <DRow label="Date & Time"      value={new Date(shown.entry.timestamp).toLocaleString('en-IN')} />
                  <DRow label="Performed By"     value={displayName(shown.entry.createdBy)} />
                  <DRow label="Item Code"        value={shown.entry.itemCode} mono />
                  <DRow label="Type"             value={shown.entry.transactionType} badge />
                  <DRow label="Source / Pack ID" value={shown.entry.sourceId} mono />
                  <DRow label="In Qty"           value={shown.entry.inQty  > 0 ? `+${Number(shown.entry.inQty).toFixed(3)}`  : '—'} tone="in" />
                  <DRow label="Out Qty"          value={shown.entry.outQty > 0 ? `-${Number(shown.entry.outQty).toFixed(3)}` : '—'} tone="out" />
                  {shown.detail?.outward?.operationalUom && Number(shown.detail.outward.operationalQty) !== Number(shown.detail.outward.qtyIssued) && (
                    <DRow label="Qty (Operational UOM)" value={`${Number(shown.detail.outward.operationalQty).toFixed(3)} ${(shown.detail.outward.operationalUom || '').toUpperCase()}`} />
                  )}
                  <DRow label="Reference"        value={shown.entry.reference || '—'} full />
                </DSection>

                {shown.detail?.pack && (
                  <DSection icon={Package} title="Pack / Bag Details">
                    <DRow label="Pack ID"   value={shown.detail.pack.packId} mono />
                    <DRow label="Item Name" value={toTitleCase(shown.detail.pack.itemName)} />
                    <DRow label="Lot No"    value={shown.detail.pack.lotNo} />
                    <DRow label="Bag No"    value={`#${shown.detail.pack.bagNo}`} />
                    <DRow label="Pack Qty"  value={`${shown.detail.pack.packQty} ${(shown.detail.pack.uom || '').toUpperCase()}`} />
                    {shown.detail.pack.supplier  && <DRow label="Supplier"   value={shown.detail.pack.supplier} />}
                    {shown.detail.pack.invoiceNo && <DRow label="Invoice No" value={shown.detail.pack.invoiceNo} />}
                  </DSection>
                )}

                {shown.detail?.inward && (
                  <DSection icon={Warehouse} title="Inward Details">
                    <DRow label="Warehouse"   value={toTitleCase(shown.detail.inward.warehouse)} />
                    <DRow label="Inward Time" value={new Date(shown.detail.inward.inwardTime).toLocaleString('en-IN')} />
                  </DSection>
                )}

                {shown.detail?.indent && (
                  <DSection icon={ClipboardList} title="Production Indent">
                    <DRow label="Indent ID" value={shown.detail.indent.indentId} mono />
                    <DRow label="Product"   value={toTitleCase(shown.detail.indent.productName)} />
                    <DRow label="DI No"     value={shown.detail.indent.diNo} />
                    <DRow label="Batch No"  value={shown.detail.indent.batchNo} />
                    <DRow label="Status"    value={shown.detail.indent.status} />
                  </DSection>
                )}

                {shown.detail?.sfg && (
                  <DSection icon={FlaskConical} title="SFG Status">
                    <DRow label="Formulated Qty" value={Number(shown.detail.sfg.formulatedQty).toFixed(2)} />
                    <DRow label="Packed Qty"     value={Number(shown.detail.sfg.packedQty).toFixed(2)} />
                    <DRow label="SFG Balance"    value={Number(shown.detail.sfg.sfgQty).toFixed(2)} />
                    <DRow label="SFG Status"     value={shown.detail.sfg.status} />
                  </DSection>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
