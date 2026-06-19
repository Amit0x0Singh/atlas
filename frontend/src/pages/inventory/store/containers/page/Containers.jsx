import { useState } from 'react'
import BackButton from '../../../../../components/erp/BackButton.jsx'
import ContainerList from '../components/ContainerList.jsx'
import CreateContainer from '../components/CreateContainer.jsx'
import WarehouseToContainer from '../../outward/components/WarehouseToContainer.jsx'
import ContainerToPlant from '../../outward/components/ContainerToPlant.jsx'

const TABS = ['All Containers', 'Create Container']

export default function Containers() {
  const [tab, setTab]               = useState(0)
  const [panel, setPanel]           = useState(null)   // 'fill' | 'issue'
  const [preselected, setPreselect] = useState(null)

  const handleSelect = (container, action) => {
    setPreselect(container)
    setPanel(action)
  }

  const closePanel = () => {
    setPanel(null)
    setPreselect(null)
  }

  // ── Fill panel ──────────────────────────────────────────────────────────────
  if (panel === 'fill') return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4 border-b border-gray-200 bg-white">
        <button onClick={closePanel} className="text-sm text-gray-500 hover:text-gray-700 mb-2">
          ← Back to Containers
        </button>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛢️</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fill Container</h1>
            <p className="text-sm text-gray-500">Transfer material from a warehouse pack into the container</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <WarehouseToContainer preselected={preselected} onDone={closePanel} />
      </div>
    </div>
  )

  // ── Issue panel ─────────────────────────────────────────────────────────────
  if (panel === 'issue') return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4 border-b border-gray-200 bg-white">
        <button onClick={closePanel} className="text-sm text-gray-500 hover:text-gray-700 mb-2">
          ← Back to Containers
        </button>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧪</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Issue from Container</h1>
            <p className="text-sm text-gray-500">Issue material from the container to the plant</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ContainerToPlant preselected={preselected} onDone={closePanel} />
      </div>
    </div>
  )

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Container Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create containers for raw materials · Fill from warehouse · Issue to plant
            </p>
          </div>
          <BackButton />
        </div>
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
        {tab === 0 && <ContainerList onSelect={handleSelect} />}
        {tab === 1 && <CreateContainer onCreated={() => setTab(0)} />}
      </div>
    </div>
  )
}
