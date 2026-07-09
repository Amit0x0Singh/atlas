import { useState } from 'react'
import './Containers.css'
import { BackButton, PageHeader } from '../../../../../components/ui'
import { Boxes, ListChecks, PackagePlus } from 'lucide-react'
import ContainerList from '../components/container-list/ContainerList.jsx'
import CreateContainer from '../components/create-container/CreateContainer.jsx'

const TABS = [
  { label: 'All Containers',    icon: ListChecks },
  { label: 'Create Container',  icon: PackagePlus },
]

export default function Containers() {
  const [tab, setTab] = useState(0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Boxes}
        title="Container Management"
        description="Create containers for raw materials · Track stock levels"
        actions={<BackButton />}
      >
        <div className="flex gap-0 border-b border-gray-200">
          {TABS.map((t, i) => {
            const Icon = t.icon
            return (
              <button key={i} onClick={() => setTab(i)}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                  tab === i ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={14.5} />
                {t.label}
              </button>
            )
          })}
        </div>
      </PageHeader>
      <div className="flex-1 overflow-y-auto">
        {tab === 0 && <ContainerList />}
        {tab === 1 && <CreateContainer onCreated={() => setTab(0)} />}
      </div>
    </div>
  )
}
