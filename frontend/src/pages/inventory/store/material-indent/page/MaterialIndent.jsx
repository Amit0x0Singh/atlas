import { useState } from 'react'
import { ClipboardPen } from 'lucide-react'
import { PageHeader, BackButton } from '../../../../../components/ui'
import { useApp } from '../../../../../context/context.jsx'
import NewIndentForm from '../components/NewIndentForm.jsx'
import MyIndentsTab from '../components/MyIndentsTab.jsx'

export default function MaterialIndent() {
  const { hasAnyPermission } = useApp()
  const canSeeAll = hasAnyPermission(['admin.panel.access', 'inventory.material-indent.issue'])

  const TABS = [
    { key: 'new',  label: 'New Indent' },
    { key: 'mine', label: canSeeAll ? 'All Indents' : 'My Plant Indents' },
  ]

  const [tab, setTab]           = useState('new')
  const [editIndent, setEdit]   = useState(null)
  const [refreshKey, setBump]   = useState(0)

  const handleSaved = (_data, submitted) => {
    setEdit(null)
    setBump(k => k + 1)
    if (submitted) setTab('mine')
  }

  const startEdit = (indent) => { setEdit(indent); setTab('new') }

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        icon={ClipboardPen}
        title="Material Indent"
        description="Request general / daily-use store items for your department"
        actions={<span className="hidden md:block"><BackButton size="sm" /></span>}
      >
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'new') { /* keep edit state */ } else setEdit(null) }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === t.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {tab === 'new'
        ? <NewIndentForm editIndent={editIndent} onSaved={handleSaved} onCancelEdit={() => { setEdit(null); setTab('mine') }} />
        : <MyIndentsTab onEditDraft={startEdit} refreshKey={refreshKey} />}
    </div>
  )
}
