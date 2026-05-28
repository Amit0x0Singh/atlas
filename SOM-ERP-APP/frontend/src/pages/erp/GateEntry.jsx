/**
 * Gate Entry — Inward + Outward with QR scan confirmation
 */
import { useState, useEffect } from 'react'
import { gateApi, erpItemsApi } from '../../api/erp-client.js'
import { useAuth } from '../../components/erp/AuthContext.jsx'
import QRScanner from '../../components/erp/QRScanner.jsx'

const STATUS_COLORS = {
  pending_review: '#f59e0b', labels_generated: '#3b82f6', qr_pending: '#f97316',
  confirmed: '#16a34a', quarantine: '#dc2626',
}
const statusLabel = { pending_review: 'Pending Review', labels_generated: 'Labels Ready', qr_pending: 'QR Pending', confirmed: 'Confirmed', quarantine: 'Quarantine' }

function Chip({ status }) {
  return (
    <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: (STATUS_COLORS[status] || '#94a3b8') + '22', color: STATUS_COLORS[status] || '#64748b' }}>
      {statusLabel[status] || status}
    </span>
  )
}

export default function GateEntry() {
  const { user, hasRole } = useAuth()
  const [tab, setTab] = useState('inward')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [quarantineCount, setQuarantineCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerPurpose, setScannerPurpose] = useState('confirm')
  const [scanInwardId, setScanInwardId] = useState(null)
  const [form, setForm] = useState({ supplier_name: '', invoice_no: '', total_qty: '', uom: 'kg', vehicle_no: '', num_packs: '1', notes: '' })
  const [outwardForm, setOutwardForm] = useState({ item_name: '', qty: '', uom: 'kg', destination: '', vehicle_no: '', authorized_by: '', notes: '' })
  const [scanFeedback, setScanFeedback] = useState(null)
  const [detail, setDetail] = useState(null)
  const [items, setItems] = useState([])

  const canStore = hasRole('store_person', 'store_manager', 'admin')
  const canGate = hasRole('gate_staff', 'store_person', 'store_manager', 'admin')

  const load = async () => {
    setLoading(true)
    try {
      const [res, qc] = await Promise.all([
        tab === 'inward' ? gateApi.inwardList({ limit: 50 }) : gateApi.outwardList({ limit: 50 }),
        gateApi.quarantineCount(),
      ])
      setList(res.data || [])
      setQuarantineCount(qc.count || 0)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  useEffect(() => {
    if (canStore) erpItemsApi.list({ active: 'true' }).then(r => setItems(r.data || [])).catch(() => {})
  }, [canStore])

  const submitInward = async () => {
    if (!form.supplier_name || !form.total_qty) return alert('Supplier and qty required')
    try {
      await gateApi.createInward(form)
      setShowForm(false)
      setForm({ supplier_name: '', invoice_no: '', total_qty: '', uom: 'kg', vehicle_no: '', num_packs: '1', notes: '' })
      load()
    } catch (e) { alert(e.message) }
  }

  const submitOutward = async () => {
    if (!outwardForm.item_name || !outwardForm.qty) return alert('Item and qty required')
    try {
      const res = await gateApi.createOutward(outwardForm)
      if (res.is_unauthorised) alert('⚠️ This outward has been flagged as UNAUTHORISED. Store manager notified.')
      setShowForm(false)
      load()
    } catch (e) { alert(e.message) }
  }

  const openDetail = async (id) => {
    try {
      const res = await gateApi.inwardDetail(id)
      setDetail(res.data)
    } catch (e) { alert(e.message) }
  }

  const confirmItem = async (inwardId, itemCode, unitPrice) => {
    try {
      const res = await gateApi.confirmItem(inwardId, { item_code: itemCode, unit_price: unitPrice || null })
      alert(`✅ ${res.data.num_packs} packs created. Lot: ${res.data.lot_number}`)
      setDetail(null)
      load()
    } catch (e) { alert(e.message) }
  }

  const handleQrScan = async (packId) => {
    setScanFeedback({ loading: true, msg: `Scanning ${packId}…` })
    try {
      const res = await gateApi.scanConfirm({ pack_id: packId })
      setScanFeedback({ success: true, msg: res.message || 'Pack confirmed!', verify: res.verify_required })
    } catch (e) {
      setScanFeedback({ success: false, msg: e.message })
    }
  }

  const S = { padding: '20px 24px', background: '#f1f5f9', minHeight: '100vh' }
  const card = { background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: '12px' }
  const btn = (col = '#3b82f6') => ({ padding: '7px 16px', background: col, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' })
  const input = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={S}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>Gate Entry</h1>
          {quarantineCount > 0 && (
            <div style={{ marginTop: '4px', padding: '4px 12px', background: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '13px', fontWeight: 600, display: 'inline-block' }}>
              🚫 {quarantineCount} packs in QUARANTINE — pending QR confirmation
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canStore && (
            <button
              onClick={() => { setScannerPurpose('confirm'); setShowScanner(true) }}
              style={btn('#6366f1')}
            >📷 Scan QR</button>
          )}
          <button onClick={() => { setShowForm(!showForm); setDetail(null) }} style={btn()}>
            {showForm ? '✕ Cancel' : `+ New ${tab === 'inward' ? 'Inward' : 'Outward'}`}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {['inward', 'outward'].map(t => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); setDetail(null) }} style={{
            padding: '8px 20px', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            background: tab === t ? '#0f172a' : '#e2e8f0', color: tab === t ? '#fff' : '#64748b',
          }}>
            {t === 'inward' ? '⬇ Inward' : '⬆ Outward'}
          </button>
        ))}
      </div>

      {/* Create Inward Form */}
      {showForm && tab === 'inward' && (
        <div style={{ ...card, border: '1.5px solid #3b82f6', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>New Gate Inward</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { key: 'supplier_name', label: 'Supplier Name*' },
              { key: 'invoice_no', label: 'Invoice No.' },
              { key: 'total_qty', label: 'Total Qty*', type: 'number' },
              { key: 'uom', label: 'UOM' },
              { key: 'vehicle_no', label: 'Vehicle No.' },
              { key: 'num_packs', label: 'No. of Packs', type: 'number' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>{label}</label>
                <input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={input} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...input, height: '60px', resize: 'vertical' }} />
          </div>
          <button onClick={submitInward} style={{ ...btn(), marginTop: '12px' }}>Create Inward Entry</button>
        </div>
      )}

      {/* Create Outward Form */}
      {showForm && tab === 'outward' && (
        <div style={{ ...card, border: '1.5px solid #f97316', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>New Gate Outward</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { key: 'item_name', label: 'Item Name*' },
              { key: 'qty', label: 'Qty*', type: 'number' },
              { key: 'uom', label: 'UOM' },
              { key: 'destination', label: 'Destination' },
              { key: 'vehicle_no', label: 'Vehicle No.' },
              { key: 'authorized_by', label: 'Authorised By' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>{label}</label>
                <input type={type || 'text'} value={outwardForm[key]} onChange={e => setOutwardForm(f => ({ ...f, [key]: e.target.value }))} style={input} />
              </div>
            ))}
          </div>
          <button onClick={submitOutward} style={{ ...btn('#f97316'), marginTop: '12px' }}>Record Outward</button>
        </div>
      )}

      {/* Inward Detail Panel */}
      {detail && (
        <div style={{ ...card, border: '1.5px solid #6366f1', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Inward Detail — {detail.supplier_name}</h3>
            <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {[['Invoice', detail.invoice_no || '—'], ['Qty', `${detail.total_qty} ${detail.uom}`], ['Packs', detail.num_packs], ['Status', <Chip status={detail.status} />]].map(([k, v]) => (
              <div key={k}><div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{k}</div><div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{v}</div></div>
            ))}
          </div>

          {/* Store: confirm item */}
          {canStore && detail.status === 'pending_review' && (
            <StoreConfirmForm detail={detail} items={items} onConfirm={confirmItem} />
          )}

          {/* Show packs if created */}
          {detail.packs?.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>PACKS ({detail.packs.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {detail.packs.map(p => (
                  <div key={p.pack_id} style={{ padding: '8px', background: p.qr_confirmed ? '#f0fdf4' : '#fef2f2', borderRadius: '6px', fontSize: '11px' }}>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '10px' }}>{p.lot_number}</div>
                    <div style={{ color: '#64748b', marginTop: '2px' }}>Seq {p.pack_seq} · {p.qty_received} {p.unit}</div>
                    <div style={{ marginTop: '2px' }}>
                      {p.qr_confirmed ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Confirmed</span> : <span style={{ color: '#dc2626' }}>⏳ Pending QR</span>}
                      {p.verify_scan_required && !p.verify_scan_done && <span style={{ color: '#f59e0b', marginLeft: '4px' }}>🔍 Verify needed</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading…</div>
      ) : (
        <div>
          {list.map(item => (
            <div key={item.inward_id || item.outward_id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>
                    {tab === 'inward' ? item.supplier_name : item.item_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                    {tab === 'inward'
                      ? `${item.total_qty} ${item.uom} · ${item.num_packs || 1} packs · ${item.invoice_no || 'No invoice'} · ${item.item_name || 'Item pending'}`
                      : `${item.qty} ${item.uom || ''} → ${item.destination || '—'}`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    {new Date(item.entry_time || item.created_at).toLocaleString('en-IN')}
                    {item.created_by_name && ` · by ${item.created_by_name}`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  {tab === 'inward' && <Chip status={item.status} />}
                  {tab === 'outward' && item.is_unauthorised && (
                    <span style={{ padding: '2px 8px', background: '#fef2f2', color: '#dc2626', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>⚠ UNAUTHORISED</span>
                  )}
                  {tab === 'inward' && (
                    <button onClick={() => openDetail(item.inward_id)} style={{ ...btn('#f8fafc'), color: '#3b82f6', border: '1px solid #e2e8f0' }}>Details</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!list.length && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No entries found</div>}
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          label="Scan Pack QR to Confirm Inward"
          onClose={() => { setShowScanner(false); setScanFeedback(null) }}
          onScan={handleQrScan}
        />
      )}

      {scanFeedback && !showScanner && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', background: scanFeedback.success ? '#f0fdf4' : '#fef2f2', borderRadius: '10px', border: `1px solid ${scanFeedback.success ? '#16a34a' : '#dc2626'}`, color: scanFeedback.success ? '#15803d' : '#dc2626', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 500 }}>
          {scanFeedback.loading ? '⏳ ' : scanFeedback.success ? '✅ ' : '❌ '}{scanFeedback.msg}
          <button onClick={() => setScanFeedback(null)} style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>✕</button>
        </div>
      )}
    </div>
  )
}

function StoreConfirmForm({ detail, items, onConfirm }) {
  const [itemCode, setItemCode] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [itemFilter, setItemFilter] = useState('')

  const filtered = items.filter(i =>
    i.item_code.toLowerCase().includes(itemFilter.toLowerCase()) ||
    i.item_name.toLowerCase().includes(itemFilter.toLowerCase())
  ).slice(0, 20)

  return (
    <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: '#1e293b' }}>📦 Store: Confirm Item Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Search & Select Item*</label>
          <input
            value={itemFilter}
            onChange={e => setItemFilter(e.target.value)}
            placeholder="Type to search items…"
            style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
          />
          {itemFilter && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', maxHeight: '180px', overflowY: 'auto', marginTop: '4px' }}>
              {filtered.map(item => (
                <div
                  key={item.item_code}
                  onClick={() => { setItemCode(item.item_code); setItemFilter(`${item.item_name} (${item.item_code})`) }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <span style={{ fontWeight: 600 }}>{item.item_code}</span> — {item.item_name} <span style={{ color: '#94a3b8' }}>({item.item_category})</span>
                </div>
              ))}
              {!filtered.length && <div style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '12px' }}>No items found</div>}
            </div>
          )}
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Unit Price (₹)</label>
          <input
            type="number"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            placeholder="Optional"
            style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>
      <button
        onClick={() => itemCode && onConfirm(detail.inward_id, itemCode, unitPrice)}
        disabled={!itemCode}
        style={{ padding: '8px 18px', background: itemCode ? '#16a34a' : '#e2e8f0', color: itemCode ? '#fff' : '#94a3b8', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: itemCode ? 'pointer' : 'not-allowed', fontSize: '13px' }}
      >
        Generate Labels & Start QR Confirmation
      </button>
    </div>
  )
}
