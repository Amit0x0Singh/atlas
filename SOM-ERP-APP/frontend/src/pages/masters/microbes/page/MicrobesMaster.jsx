import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { microbialSfgApi } from '../../../../api/client.js'

const S = {
  page: { padding: '24px', fontFamily: "'Inter',system-ui,sans-serif", maxWidth: '960px' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  h1:   { fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 },
  sub:  { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  label:{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input:{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' },
  btnPrimary:{ padding: '9px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
  btnOutline:{ padding: '8px 16px', background: '#fff', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: '7px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
  btnDanger: { padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' },
  btnEdit:   { padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer', marginRight: '6px' },
  table:{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:   { textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' },
  td:   { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f172a', verticalAlign: 'middle' },
  badge:{ display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: '#eff6ff', color: '#2563eb' },
}

export default function MicrobesMaster() {
  const [microbes, setMicrobes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('list')
  const [form, setForm]         = useState({ microbe_name: '', microbe_code: '' })
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [importRows, setImportRows]   = useState([])
  const [importStatus, setImportStatus] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await microbialSfgApi.listMicrobes()
      setMicrobes(res?.data || [])
    } catch { /* silent */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await microbialSfgApi.updateMicrobe(editId, form)
      } else {
        await microbialSfgApi.createMicrobe(form)
      }
      setForm({ microbe_name: '', microbe_code: '' })
      setEditId(null)
      setTab('list')
      await load()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  const handleEdit = (m) => {
    setForm({ microbe_name: m.microbe_name, microbe_code: m.microbe_code })
    setEditId(m.microbe_id)
    setTab('add')
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    await microbialSfgApi.deleteMicrobe(id)
    await load()
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      setImportRows(rows)
      setImportStatus(null)
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!importRows.length) return
    setImportLoading(true)
    try {
      const res = await microbialSfgApi.importMicrobes(importRows)
      setImportStatus(res)
      await load()
    } catch (err) { alert(err.message) }
    setImportLoading(false)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Microbe Name': 'Bacillus subtilis', 'Microbe Code': 'BS001' },
      { 'Microbe Name': 'Trichoderma viride', 'Microbe Code': 'TV001' },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Microbes')
    XLSX.writeFile(wb, 'microbe_master_template.xlsx')
  }

  const filtered = microbes.filter(m =>
    m.microbe_name.toLowerCase().includes(search.toLowerCase()) ||
    m.microbe_code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={S.page}>
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>🦠 Microbes Master</h1>
          <p style={S.sub}>Manage microbe names and codes used across the SFG module</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={S.btnOutline} onClick={() => { setTab('import') }}>⇪ Import Excel</button>
          <button style={S.btnPrimary} onClick={() => { setForm({ microbe_name: '', microbe_code: '' }); setEditId(null); setTab('add') }}>+ Add Microbe</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {[['list', '📋 Microbe List'], ['add', editId ? '✏️ Edit Microbe' : '+ Add Microbe'], ['import', '⇪ Import from Excel']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 18px', borderRadius: '8px 8px 0 0', fontSize: '13px', fontWeight: 600,
            border: '1px solid #e2e8f0', borderBottom: tab === k ? '2px solid #1e3a5f' : '1px solid #e2e8f0',
            background: tab === k ? '#fff' : '#f8fafc', color: tab === k ? '#1e3a5f' : '#64748b', cursor: 'pointer',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'list' && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>{filtered.length} microbe(s) registered</span>
            <input placeholder="Search name or code…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, width: '220px' }} />
          </div>
          {loading ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🦠</div>
              <p style={{ fontSize: '14px' }}>No microbes found. Add one or import from Excel.</p>
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  <th style={S.th}>Microbe Name</th>
                  <th style={S.th}>Microbe Code</th>
                  <th style={S.th}>Added</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.microbe_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...S.td, color: '#94a3b8', width: '40px' }}>{i + 1}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{m.microbe_name}</td>
                    <td style={S.td}><span style={S.badge}>{m.microbe_code}</span></td>
                    <td style={{ ...S.td, color: '#94a3b8', fontSize: '12px' }}>
                      {new Date(m.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={S.td}>
                      <button style={S.btnEdit} onClick={() => handleEdit(m)}>✏️ Edit</button>
                      <button style={S.btnDanger} onClick={() => handleDelete(m.microbe_id, m.microbe_name)}>🗑 Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'add' && (
        <div style={S.card}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '20px' }}>
            {editId ? '✏️ Edit Microbe' : '+ New Microbe'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={S.label}>Microbe Name *</label>
                <input style={S.input} placeholder="e.g. Bacillus subtilis"
                  value={form.microbe_name}
                  onChange={e => setForm(p => ({ ...p, microbe_name: e.target.value }))}
                  required />
              </div>
              <div>
                <label style={S.label}>Microbe Code *</label>
                <input style={{ ...S.input, textTransform: 'uppercase' }} placeholder="e.g. BS001"
                  value={form.microbe_code}
                  onChange={e => setForm(p => ({ ...p, microbe_code: e.target.value.toUpperCase() }))}
                  required />
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Used to build container codes, e.g. BS001-BM-001
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={S.btnPrimary} disabled={saving}>
                {saving ? 'Saving…' : editId ? '💾 Update' : '+ Add Microbe'}
              </button>
              <button type="button" style={S.btnOutline} onClick={() => { setTab('list'); setEditId(null); setForm({ microbe_name: '', microbe_code: '' }) }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'import' && (
        <div style={S.card}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '4px' }}>⇪ Import Microbes from Excel</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            Upload an Excel file with columns: <strong>Microbe Name</strong>, <strong>Microbe Code</strong>. Existing codes will be updated.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button style={S.btnOutline} onClick={downloadTemplate}>⬇ Download Template</button>
            <button style={S.btnPrimary} onClick={() => fileRef.current?.click()}>📂 Choose Excel File</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          {importRows.length > 0 && (
            <>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, marginBottom: '8px' }}>
                  Preview — {importRows.length} row(s) detected
                </p>
                <table style={{ ...S.table, fontSize: '12px' }}>
                  <thead>
                    <tr>{Object.keys(importRows[0]).map(k => <th key={k} style={{ ...S.th, padding: '6px 10px' }}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 8).map((r, i) => (
                      <tr key={i}>{Object.values(r).map((v, j) => <td key={j} style={{ ...S.td, padding: '6px 10px' }}>{String(v)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 8 && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>…and {importRows.length - 8} more rows</p>}
              </div>
              <button style={S.btnPrimary} onClick={handleImport} disabled={importLoading}>
                {importLoading ? 'Importing…' : `✅ Import ${importRows.length} Microbe(s)`}
              </button>
            </>
          )}

          {importStatus && (
            <div style={{ marginTop: '16px', fontSize: '13px' }}>
              <div style={{
                padding: '14px 18px', borderRadius: '8px', marginBottom: importStatus.errors?.length ? '10px' : 0,
                background: importStatus.imported > 0 ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${importStatus.imported > 0 ? '#bbf7d0' : '#fcd34d'}`,
              }}>
                <strong style={{ color: importStatus.imported > 0 ? '#15803d' : '#92400e' }}>
                  {importStatus.imported > 0 ? '✅ Import complete' : '⚠️ Import finished with issues'}
                </strong>
                <span style={{ marginLeft: '12px', color: '#374151' }}>
                  <strong style={{ color: '#15803d' }}>{importStatus.imported} imported</strong>
                  {importStatus.skipped > 0 && <> · <strong style={{ color: '#dc2626' }}>{importStatus.skipped} skipped</strong></>}
                </span>
              </div>
              {importStatus.imported === 0 && importStatus.skipped > 0 && (
                <div style={{ padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', marginBottom: '10px' }}>
                  <p style={{ fontWeight: 700, color: '#c2410c', marginBottom: '6px' }}>Common causes:</p>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#92400e', lineHeight: '1.8' }}>
                    <li>Column headers must be exactly <strong>Microbe Name</strong> and <strong>Microbe Code</strong> (case-sensitive)</li>
                    <li>Detected columns: <strong>{importRows[0] ? Object.keys(importRows[0]).join(', ') : '—'}</strong></li>
                  </ul>
                </div>
              )}
              {importStatus.errors?.length > 0 && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                  <p style={{ fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>Error details ({importStatus.errors.length}):</p>
                  {importStatus.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#991b1b', padding: '3px 0', borderBottom: i < importStatus.errors.length - 1 ? '1px solid #fee2e2' : 'none' }}>
                      <span style={{ fontFamily: 'monospace', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', marginRight: '8px' }}>{e.row || e.code || `row ${i+1}`}</span>
                      {e.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
