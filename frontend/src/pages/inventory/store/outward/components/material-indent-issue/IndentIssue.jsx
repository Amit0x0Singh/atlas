import { useState, useEffect, useCallback } from 'react'
import { Button } from '../../../../../../components/ui'
import { History, Inbox } from 'lucide-react'
import { materialIndentApi } from '../../../../../../api/inventory.js'
import IndentSelectStep from './IndentSelectStep.jsx'
import IndentChecklistStep from './IndentChecklistStep.jsx'
import IndentDetailModal from '../../../material-indent/components/IndentDetailModal.jsx'

// "Open Indents" workflow, mounted as a mode on Store Outward. Lets the store
// person work through incoming Material Indents, issuing each line by QR scan.
export default function IndentIssue() {
  const [view, setView]         = useState('open') // 'open' | 'history'
  const [indents, setIndents]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)   // checklist target (OPEN/PARTIAL)
  const [detail, setDetail]     = useState(null)   // read-only modal (terminal status)

  const load = useCallback(() => {
    setLoading(true)
    materialIndentApi.list({ scope: 'store', status: view === 'open' ? 'active' : 'history', limit: 200 })
      .then(r => setIndents(r.data || []))
      .catch(() => setIndents([]))
      .finally(() => setLoading(false))
  }, [view])

  useEffect(() => { if (!selected) load() }, [load, selected])

  const openIndent = (ind) => {
    if (['OPEN', 'PARTIAL'].includes(ind.status)) {
      materialIndentApi.get(ind.id).then(r => setSelected(r.data)).catch(() => setSelected(ind))
    } else {
      setDetail(ind)
    }
  }

  const onChanged = (fresh) => {
    // Keep COMPLETED on screen so the checklist can show its "all issued"
    // state; only REJECTED / CANCELLED bounce straight back to the list.
    if (['OPEN', 'PARTIAL', 'COMPLETED'].includes(fresh.status)) setSelected(fresh)
    else { setSelected(null); load() }
  }

  if (selected) {
    return <IndentChecklistStep indent={selected} onBack={() => setSelected(null)} onChanged={onChanged} />
  }

  return (
    <>
      <div className="px-4 md:px-6 pt-4 flex gap-2">
        <Button variant={view === 'open' ? 'purple' : 'outline-gray'} size="sm" icon={Inbox} onClick={() => setView('open')}>Open</Button>
        <Button variant={view === 'history' ? 'purple' : 'outline-gray'} size="sm" icon={History} onClick={() => setView('history')}>Indent History</Button>
      </div>
      <IndentSelectStep view={view} indents={indents} loading={loading} onOpen={openIndent} onReload={load} />
      <IndentDetailModal indent={detail} open={!!detail} onClose={() => setDetail(null)} />
    </>
  )
}
