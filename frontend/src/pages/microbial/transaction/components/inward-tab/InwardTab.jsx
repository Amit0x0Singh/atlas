import { useEffect, useMemo, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { useMicrobes } from '../../../../../hooks/masters/useMicrobes.js'
import { useMicrobialInward, useCreateMicrobialInward, useImportMicrobialInward } from '../../../../../hooks/microbial/useMicrobialInward.js'
import InwardTable from './InwardTable.jsx'
import InwardFormModal from './InwardFormModal.jsx'
import InwardImportModal from './InwardImportModal.jsx'

export default function InwardTab() {
  const [filterMicrobe, setFilterMicrobe] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('ACTIVE')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const { data: microbes = [] } = useMicrobes()
  const { data: records = [], isLoading } = useMicrobialInward({ status: filterStatus || undefined })
  // Unfiltered (status-agnostic) list, just for the "Use Previous Entry"
  // lookup in the form — that should find the last batch for a microbe
  // regardless of whether it's since gone EXHAUSTED.
  const { data: allRecords = [] } = useMicrobialInward({})
  const createInward = useCreateMicrobialInward()
  const importInward = useImportMicrobialInward()

  useEffect(() => { setPage(1) }, [filterMicrobe, filterType, filterStatus])

  const microbeOptions = useMemo(() => [...new Set(records.map((r) => r.microbe_code))], [records])
  const typeOptions = useMemo(() => [...new Set(records.map((r) => r.microbe_type))], [records])

  const filtered = records.filter(
    (r) => (!filterMicrobe || r.microbe_code === filterMicrobe) && (!filterType || r.microbe_type === filterType)
  )
  const pageRows = filtered.slice((page - 1) * limit, page * limit)

  const handleSave = async (payload) => {
    try {
      await createInward.mutateAsync(payload)
      setShowForm(false)
    } catch (err) { alert(err.message) }
  }

  const handleImport = async (rows) => {
    try {
      return await importInward.mutateAsync(rows)
    } catch (err) { alert(err.message); return null }
  }

  return (
    <div>
      <div className="flex justify-end gap-3 mb-4">
        <Button variant="outline-gray" icon={Upload} onClick={() => setShowImport(true)}>Import Excel</Button>
        <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>New Inward Entry</Button>
      </div>

      <InwardTable
        rows={pageRows}
        loading={isLoading}
        microbeOptions={microbeOptions}
        typeOptions={typeOptions}
        filterMicrobe={filterMicrobe} setFilterMicrobe={setFilterMicrobe}
        filterType={filterType} setFilterType={setFilterType}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        page={page} limit={limit} total={filtered.length}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1) }}
      />

      <InwardFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        microbes={microbes}
        typeOptions={typeOptions}
        recentRecords={allRecords}
        onSave={handleSave}
        saving={createInward.isPending}
      />
      <InwardImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        importing={importInward.isPending}
      />
    </div>
  )
}
