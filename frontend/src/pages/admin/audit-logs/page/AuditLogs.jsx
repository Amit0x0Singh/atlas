import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { BackButton, PageHeader } from '../../../../components/ui'
import AuditTable from '../components/audit-table/AuditTable.jsx'
import AuditDetailModal from '../components/audit-detail-modal/AuditDetailModal.jsx'
import { EMPTY_AUDIT_FILTERS, DEFAULT_AUDIT_SORT } from '../components/audit-table/AuditToolbar.jsx'
import { useAuditLogs, useAuditLogMeta } from '../../../../hooks/admin/useAuditLogs.js'
import { useUsers } from '../../../../hooks/masters/useUserRoles.js'
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue.js'
import { auditLogApi } from '../../../../api/admin.js'

export default function AuditLogs() {
  const [viewing, setViewing]  = useState(null)
  const [search, setSearch]    = useState('')
  const [filters, setFilters]  = useState(EMPTY_AUDIT_FILTERS)
  const [sort, setSort]        = useState(DEFAULT_AUDIT_SORT)
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(25)
  const [exporting, setExporting] = useState(false)

  // `search` maps to the backend's `recordId` param — the toolbar's single
  // search box is this table's primary quick filter.
  const debouncedFilters = useDebouncedValue({ ...filters, recordId: search || filters.recordId }, 300)
  useEffect(() => { setPage(1) }, [debouncedFilters, sort])

  const queryParams = { ...debouncedFilters, sortField: sort.field, sortDir: sort.direction, page, limit }
  const { data: result, isLoading: loading } = useAuditLogs(queryParams)
  const items = result?.items ?? []
  const total = result?.total ?? 0

  const { data: meta } = useAuditLogMeta()
  const { data: users = [] } = useUsers()
  const userOptions = users.map(u => ({ value: u.userId, label: u.fullName || u.email }))

  // Fetches every row matching the current filters (bounded to a large but
  // finite page, not the full unbounded history) rather than exporting just
  // the page on screen.
  async function exportAuditCsv() {
    setExporting(true)
    try {
      const r = await auditLogApi.list({ ...debouncedFilters, sortField: sort.field, sortDir: sort.direction, page: 1, limit: 5000 })
      const all = r.data || []
      if (!all.length) { alert('No audit records to export — adjust your filters.'); return }
      const headers = ['Date', 'User', 'Action', 'Module', 'Resource', 'Record ID', 'IP Address']
      const rows = all.map(row => [
        new Date(row.createdAt).toLocaleString('en-IN'), row.fullName || row.username || '', row.action, row.module || '', row.tableName || '', row.recordId || '', row.ipAddress || '',
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      alert(e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={ShieldAlert}
        title="Audit Logs"
        description="Who did what, when — every create, update, delete, and security-sensitive action across the app."
        actions={<BackButton />}
      />

      <div className="p-6">
        <AuditTable
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          userOptions={userOptions}
          actionOptions={meta?.actions || []}
          moduleOptions={meta?.modules || []}
          tableOptions={meta?.tables || []}
          onExport={exportAuditCsv}
          exporting={exporting}
          items={items}
          total={total}
          loading={loading}
          page={page}
          limit={limit}
          onRowClick={setViewing}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />

        <AuditDetailModal row={viewing} onClose={() => setViewing(null)} />
      </div>
    </div>
  )
}
