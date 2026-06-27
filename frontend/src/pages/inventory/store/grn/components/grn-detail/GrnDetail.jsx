import { useRef } from 'react'
import './GrnDetail.css'
import MetaField from '../meta-field/MetaField.jsx'
import { Button } from '../../../../../../components/ui'
import { Printer } from 'lucide-react'

const COMPANY = {
  name:     'SOM Phytopharma (India) Ltd',
  address:  'Plot No 154/A5-1, SVCIE, IDA Bollaram,',
  address2: 'Sangareddy Dist, Hyderabad, TS — 502325, India',
}

function grnNumber(grn) {
  return `GRN-${grn.invoiceNo?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'NOINV'}-${new Date(grn.createdAt).getFullYear()}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function GrnDetail({ selected, detail, loading }) {
  const printRef = useRef(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>GRN — ${detail?.invoiceNo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #1e293b; }
          .grn-wrap { max-width: 900px; margin: 0 auto; padding: 32px; }
          h1 { font-size: 20px; font-weight: 800; letter-spacing: 0.04em; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #0f172a; color: #f8fafc; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          tr:nth-child(even) td { background: #f8fafc; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head><body><div class="grn-wrap">${content}</div></body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  if (!selected) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <p className="text-5xl mb-4">☰</p>
        <p className="font-semibold text-gray-500 text-lg">Select a GRN from the left</p>
        <p className="text-sm mt-1">Preview and print Goods Received Notes</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading GRN…</div>
  }

  if (!detail) return null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-gray-900">{grnNumber(selected)}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{detail.supplier} — Invoice {detail.invoiceNo}</p>
        </div>
        <Button variant="primary" icon={Printer} onClick={handlePrint}>
          Print GRN
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div ref={printRef}>
          {/* Letterhead */}
          <div className="gd-letterhead">
            <div className="gd-letterhead-inner">
              <div>
                <h1 className="gd-company-name">{COMPANY.name}</h1>
                <p className="gd-company-addr">{COMPANY.address}</p>
                <p className="gd-company-addr2">{COMPANY.address2}</p>
              </div>
              <div className="gd-doc-label">
                <div className="gd-doc-tag">DOCUMENT</div>
                <div className="gd-doc-title">GRN</div>
                <div className="gd-doc-number">{grnNumber(selected)}</div>
              </div>
            </div>
          </div>

          {/* Meta grid */}
          <div className="gd-meta-grid">
            <MetaField label="Invoice No" value={detail.invoiceNo} />
            <MetaField label="Supplier" value={detail.supplier} />
            <MetaField label="Received Date" value={fmtDate(detail.receivedDate)} />
            <MetaField label="Total Bags" value={String(detail.totalPacks)} />
          </div>

          {/* Items table */}
          <div className="gd-items-section">
            <p className="gd-items-label">RECEIVED ITEMS</p>
            <table className="gd-table">
              <thead>
                <tr className="gd-thead-row">
                  {['#', 'Item Name', 'Item Code', 'Lot No', 'No. of Bags', 'Qty / Bag', 'Total Qty', 'UOM'].map(h => (
                    <th key={h} className={['#', 'No. of Bags', 'Qty / Bag', 'Total Qty'].includes(h) ? 'gd-th-center' : 'gd-th-left'}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item, i) => (
                  <tr key={item.itemCode} className={i % 2 === 1 ? 'gd-tr-even' : 'gd-tr-odd'}>
                    <td className="gd-td-index">{i + 1}</td>
                    <td className="gd-td-name">{item.itemName}</td>
                    <td className="gd-td-code">{item.itemCode}</td>
                    <td className="gd-td-mono">{item.lotNo}</td>
                    <td className="gd-td-bold">{item.totalBags}</td>
                    <td className="gd-td-center">{Number(item.packQty).toFixed(2)}</td>
                    <td className="gd-td-total-qty">{Number(item.totalQty).toFixed(2)}</td>
                    <td className="gd-td-uom">{item.uom}</td>
                  </tr>
                ))}
                <tr className="gd-tfoot-row">
                  <td colSpan={4} className="gd-tfoot-label">TOTAL</td>
                  <td className="gd-tfoot-bags">{detail.totalPacks} bags</td>
                  <td />
                  <td className="gd-tfoot-total">{Number(detail.totalQty).toFixed(2)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          <div className="gd-remarks">
            <p className="gd-remarks-text">
              Received in good condition. All quantities verified at the time of receipt.
            </p>
          </div>

          {/* Signature strip */}
          <div className="gd-sig-strip">
            {['Received By (Stores)', 'Verified By (QC)', 'Approved By (Manager)'].map(s => (
              <div key={s}>
                <div className="gd-sig-line" />
                <p className="gd-sig-label">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
