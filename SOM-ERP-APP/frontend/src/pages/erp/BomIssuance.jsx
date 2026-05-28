/**
 * BOM Issuance — batch-by-batch material issuance with FIFO enforcement, scrap, and reprocess
 */
import { useState, useEffect, useCallback } from 'react'
import api from '../../api/erp-client.js'
import { useAuth } from '../../components/erp/AuthContext.jsx'
import QRScanner from '../../components/erp/QRScanner.jsx'

const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }
const labelStyle = { display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }
const btnPrimary = (disabled) => ({ padding: '9px 18px', background: disabled ? '#94a3b8' : '#1e3a5f', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer' })

const statusBadge = (status) => {
  const cfg = {
    pending: { bg: '#fef3c7', tx: '#92400e' }, in_progress: { bg: '#ede9fe', tx: '#6b21a8' },
    completed: { bg: '#dcfce7', tx: '#166534' }, qc_passed: { bg: '#dcfce7', tx: '#166534' },
    qc_failed: { bg: '#fee2e2', tx: '#991b1b' }, scrapped: { bg: '#fee2e2', tx: '#991b1b' },
    issued: { bg: '#dcfce7', tx: '#166534' }, partial: { bg: '#fef3c7', tx: '#92400e' },
    not_started: { bg: '#f1f5f9', tx: '#475569' },
  }
  const c = cfg[status] || { bg: '#f1f5f9', tx: '#475569' }
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: c.bg, color: c.tx }}>{status?.replace(/_/g, ' ')}</span>
}

// ─── Issue Line ───────────────────────────────────────────────────────────────
function IssueLine({ line, jobId, onIssued }) {
  const [showIssue, setShowIssue] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [form, setForm] = useState({ pack_id: '', qty_issued: line.required_qty, notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fifoWarning, setFifoWarning] = useState(null)

  const selectPack = (packId) => {
    setForm(f => ({ ...f, pack_id: packId }))
    setShowScanner(false)
    // Check FIFO if scanned pack is not the FIFO pack
    if (line.fifo_packs?.length > 0 && line.fifo_packs[0].id !== packId) {
      setFifoWarning({ oldest_lot: line.fifo_packs[0].lot_number })
    } else {
      setFifoWarning(null)
    }
  }

  const issue = async () => {
    if (!form.pack_id) { setError('Select or scan a pack'); return }
    setSaving(true); setError('')
    try {
      await api.bomIssuance.issueLine({ job_id: jobId, bom_line_id: line.id, pack_id: form.pack_id, qty_issued: Number(form.qty_issued), notes: form.notes })
      setShowIssue(false)
      onIssued()
    } catch (e) {
      const err = e.response?.data
      if (e.response?.status === 409 && err?.fifo_violation) {
        setError(`FIFO violation: Must use ${err.oldest_lot} first. Request manager FIFO override before proceeding.`)
      } else {
        setError(err?.error || e.message)
      }
    }
    finally { setSaving(false) }
  }

  const alreadyIssued = line.issued_qty >= line.required_qty

  return (
    <div style={{ border: `1px solid ${alreadyIssued ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '8px', padding: '14px', marginBottom: '8px', background: alreadyIssued ? '#f0fdf4' : '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px' }}>{line.item_name} <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>({line.item_code})</span></div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Required: <strong>{line.required_qty} {line.uom}</strong>
            {line.issued_qty > 0 && <> | Issued: <strong style={{ color: '#16a34a' }}>{line.issued_qty} {line.uom}</strong></>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {statusBadge(alreadyIssued ? 'issued' : line.issued_qty > 0 ? 'partial' : 'not_started')}
          {!alreadyIssued && <button onClick={() => setShowIssue(s => !s)} style={{ padding: '6px 14px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            {showIssue ? 'Cancel' : 'Issue'}
          </button>}
        </div>
      </div>

      {showIssue && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          {/* FIFO Pack List */}
          {line.fifo_packs?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>AVAILABLE PACKS (FIFO ORDER)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {line.fifo_packs.slice(0, 5).map((p, i) => (
                  <button key={p.id} onClick={() => selectPack(p.id)} style={{
                    padding: '6px 12px', border: `2px solid ${form.pack_id === p.id ? '#3b82f6' : i === 0 ? '#16a34a' : '#e2e8f0'}`,
                    borderRadius: '6px', background: form.pack_id === p.id ? '#dbeafe' : i === 0 ? '#f0fdf4' : '#fff',
                    fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer',
                  }}>
                    {i === 0 && <span style={{ color: '#16a34a', marginRight: '4px' }}>★</span>}
                    {p.lot_number} — {p.current_qty} {p.uom}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>★ = FIFO oldest lot (must issue first)</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>PACK ID (scan or type)</label>
              <input value={form.pack_id} onChange={e => setForm(f => ({ ...f, pack_id: e.target.value }))} placeholder="Pack UUID or scan QR" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} />
            </div>
            <div>
              <label style={labelStyle}>QTY TO ISSUE</label>
              <input type="number" value={form.qty_issued} onChange={e => setForm(f => ({ ...f, qty_issued: e.target.value }))} style={inputStyle} />
            </div>
            <button onClick={() => setShowScanner(true)} style={{ padding: '9px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📷 Scan
            </button>
            <button onClick={issue} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Issuing…' : 'Confirm Issue'}</button>
          </div>

          {fifoWarning && (
            <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
              ⚠ Selected pack is not the FIFO oldest. Oldest lot: <strong>{fifoWarning.oldest_lot}</strong>. Proceed only with manager FIFO override.
            </div>
          )}

          {error && <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '12px' }}>{error}</div>}
        </div>
      )}

      {showScanner && <QRScanner onScan={selectPack} onClose={() => setShowScanner(false)} label="Scan Pack QR Code" />}
    </div>
  )
}

// ─── Job Detail ───────────────────────────────────────────────────────────────
function JobDetail({ job, onClose, onRefresh }) {
  const { hasRole } = useAuth()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scrapForm, setScrapForm] = useState({ show: false, reason_code: '', notes: '' })
  const [reasons, setReasons] = useState([])
  const [saving, setSaving] = useState(false)

  const loadDetail = useCallback(() => {
    api.bomIssuance.getJob(job.id).then(r => setDetail(r.data)).finally(() => setLoading(false))
  }, [job.id])

  useEffect(() => {
    loadDetail()
    api.masters.listReasonCodes('production_loss').then(r => setReasons(r.data || []))
  }, [loadDetail])

  const scrap = async () => {
    if (!scrapForm.reason_code) { alert('Reason required'); return }
    setSaving(true)
    try {
      await api.bomIssuance.scrapJob(job.id, scrapForm)
      onRefresh()
    } catch (e) { alert(e.response?.data?.error || e.message) }
    finally { setSaving(false) }
  }

  const reprocess = async () => {
    if (!window.confirm('Create a rework job for this batch?')) return
    setSaving(true)
    try {
      await api.bomIssuance.reprocessJob(job.id)
      onRefresh()
    } catch (e) { alert(e.response?.data?.error || e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '580px', background: '#fff', height: '100%', overflowY: 'auto', padding: '28px', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Batch {detail?.batch_number || job.batch_number}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{detail?.product_name || job.product_name}</div>
            <div style={{ marginTop: '6px' }}>{statusBadge(detail?.status || job.status)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading…</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
              <div><div style={labelStyle}>LOT NUMBER</div><div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{detail.lot_number || '—'}</div></div>
              <div><div style={labelStyle}>BATCH SIZE</div><div style={{ fontWeight: 600 }}>{detail.batch_size_kg} kg</div></div>
              <div><div style={labelStyle}>DI NUMBER</div><div style={{ fontFamily: 'monospace' }}>{detail.di_number}</div></div>
              <div><div style={labelStyle}>PLANT</div><div>{detail.plant_name}</div></div>
            </div>

            {/* Sequential gate warning */}
            {detail.blocked_reason && (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
                🔒 <strong>Blocked:</strong> {detail.blocked_reason}
              </div>
            )}

            {/* BOM Lines */}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>BOM ISSUANCE</div>
            {detail.bom_lines?.length === 0 && <div style={{ color: '#94a3b8', fontSize: '13px' }}>No BOM lines</div>}
            {detail.bom_lines?.map(line => (
              <IssueLine key={line.id} line={line} jobId={job.id} onIssued={loadDetail} />
            ))}

            {/* Scrap / Reprocess */}
            {hasRole(['plant_supervisor', 'admin']) && ['in_progress', 'qc_failed'].includes(detail.status) && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setScrapForm(f => ({ ...f, show: !f.show }))} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Scrap Batch
                  </button>
                  {detail.status === 'qc_failed' && (
                    <button onClick={reprocess} disabled={saving} style={{ padding: '8px 16px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Create Rework Job
                    </button>
                  )}
                </div>
                {scrapForm.show && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', marginTop: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={labelStyle}>SCRAP REASON *</label>
                        <select value={scrapForm.reason_code} onChange={e => setScrapForm(f => ({ ...f, reason_code: e.target.value }))} style={inputStyle}>
                          <option value="">Select…</option>
                          {reasons.map(r => <option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>NOTES</label><input value={scrapForm.notes} onChange={e => setScrapForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} /></div>
                    </div>
                    <button onClick={scrap} disabled={saving} style={{ ...btnPrimary(saving), background: '#dc2626', marginTop: '10px' }}>
                      {saving ? 'Scrapping…' : 'Confirm Scrap'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BomIssuance() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    api.bomIssuance.pendingJobs().then(r => setJobs(r.data || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (tab === 1) {
      api.bomIssuance.history().then(r => setHistory(r.data || []))
    }
  }, [tab])

  const filtered = statusFilter ? jobs.filter(j => j.status === statusFilter) : jobs

  return (
    <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>BOM Issuance</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Batch-by-batch material issuance with FIFO enforcement</p>
      </div>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#1e40af' }}>
        <strong>Sequential Issuance Rule:</strong> Batch N+1 is locked until Batch N is QC-passed or scrapped. Hard FIFO — 409 error returned if non-FIFO pack selected.
      </div>

      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
        {['Pending Jobs', 'Issuance History'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 18px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: tab === i ? '#fff' : 'transparent', color: tab === i ? '#1e293b' : '#64748b',
            boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: '200px' }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="qc_failed">QC Failed</option>
            </select>
          </div>

          {loading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>Loading…</div> : (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Batch', 'Product', 'DI Number', 'Batch Size', 'Plant', 'Planned Start', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>No jobs in queue</td></tr>
                  ) : filtered.map(j => (
                    <tr key={j.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => setSelectedJob(j)}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>Batch {j.batch_number}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{j.product_name}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{j.di_number}</td>
                      <td style={{ padding: '12px 16px' }}>{j.batch_size_kg} kg</td>
                      <td style={{ padding: '12px 16px' }}>{j.plant_name}</td>
                      <td style={{ padding: '12px 16px' }}>{j.planned_start ? new Date(j.planned_start).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{statusBadge(j.status)}</td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 1 && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Item', 'Pack / Lot', 'Qty Issued', 'Job', 'Issued By', 'Date'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>No issuance history</td></tr>
              ) : history.map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 500 }}>{h.item_name}</td>
                  <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{h.lot_number}</td>
                  <td style={{ padding: '11px 16px', fontWeight: 600 }}>{h.qty_issued} {h.uom}</td>
                  <td style={{ padding: '11px 16px' }}>Batch {h.batch_number} — {h.product_name}</td>
                  <td style={{ padding: '11px 16px' }}>{h.issued_by_name}</td>
                  <td style={{ padding: '11px 16px' }}>{h.issued_at ? new Date(h.issued_at).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedJob && (
        <JobDetail
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onRefresh={() => { load(); setSelectedJob(null) }}
        />
      )}
    </div>
  )
}
