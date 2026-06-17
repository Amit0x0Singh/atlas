import { useState } from 'react'
import ContainerList from '../components/ContainerList.jsx'
import CreateContainer from '../components/CreateContainer.jsx'

const TABS = ['All Containers', 'Create Container']

export default function Containers() {
  const [tab, setTab] = useState(0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0">
        <h1 className="text-2xl font-bold text-gray-900">Container Management</h1>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Create containers for raw materials and print QR labels.
          To fill or issue from a container, go to <strong>Outward</strong>.
        </p>
        <div className="flex gap-0 border-b border-gray-200">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                tab === i ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 0 && <ContainerList onSelect={() => {}} />}
        {tab === 1 && <CreateContainer onCreated={() => setTab(0)} />}
      </div>
    </div>
  )
}
