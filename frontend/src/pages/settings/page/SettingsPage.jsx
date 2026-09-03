import { useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { PageHeader, BackButton } from '../../../components/ui'
import { useApp } from '../../../context/context.jsx'
import OptionGroupsList from '../components/options/OptionGroupsList.jsx'

export default function SettingsPage() {
  const { hasPermission } = useApp()
  // Drill-down state lives here so the one header "Back" goes a single step:
  // out of an open group/section first, then off the page.
  const [selected, setSelected] = useState(null)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Admin-managed dropdown options."
        actions={<BackButton onClick={selected ? () => setSelected(null) : undefined} />}
      />

      <div className="p-4 md:p-6">
        {hasPermission('admin.settings.access') ? (
          <OptionGroupsList selected={selected} setSelected={setSelected} />
        ) : (
          <p className="text-sm text-gray-500">You don't have access to this page.</p>
        )}
      </div>
    </div>
  )
}
