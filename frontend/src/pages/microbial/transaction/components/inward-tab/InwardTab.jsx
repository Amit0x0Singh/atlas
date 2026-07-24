import { useMicrobes } from '../../../../../hooks/masters/useMicrobes.js'
import { useMicrobialInward, useCreateMicrobialInward, useImportMicrobialInward } from '../../../../../hooks/microbial/useMicrobialInward.js'
import InwardTable from './InwardTable.jsx'
import InwardFormModal from './InwardFormModal.jsx'
import InwardImportModal from './InwardImportModal.jsx'

const RECENT_COUNT = 5

export default function InwardTab({ showForm, setShowForm, showImport, setShowImport }) {
  const { data: microbes = [] } = useMicrobes()
  // Status-agnostic — "recent" means the last things recorded, active or exhausted.
  const { data: allRecords = [], isLoading } = useMicrobialInward({})
  const createInward = useCreateMicrobialInward()
  const importInward = useImportMicrobialInward()

  const recentRows = [...allRecords]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, RECENT_COUNT)

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
      <InwardTable rows={recentRows} loading={isLoading} />

      <InwardFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        microbes={microbes}
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
