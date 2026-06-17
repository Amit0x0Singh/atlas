import { useState } from 'react'
import ContainerList from '../components/ContainerList.jsx'
import CreateContainer from '../components/CreateContainer.jsx'
import FillContainer from '../components/FillContainer.jsx'
import IssueFromContainer from '../components/IssueFromContainer.jsx'

const TABS = ['All Containers', 'Create Container', 'Fill Container', 'Issue from Container']

export default function Containers() {
  const [tab, setTab]               = useState(0)
  const [preselected, setPreselected] = useState(null)
  const [fillOrIssue, setFillOrIssue] = useState(null)

  const handleCardAction = (container, action) => {
    setPreselected(container)
    setFillOrIssue(action)
    setTab(action === 'fill' ? 2 : 3)
  }

  const handleDone = () => {
    setPreselected(null)
    setFillOrIssue(null)
    setTab(0)
  }

  const switchTab = (i) => {
    setTab(i)
    if (i !== 2 && i !== 3) { setPreselected(null); setFillOrIssue(null) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0">
        <h1 className="text-2xl font-bold text-gray-900">Container Management</h1>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Create containers for raw materials · Fill from warehouse packs · Issue to plant
        </p>
        <div className="flex gap-0 border-b border-gray-200">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => switchTab(i)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                tab === i ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 0 && <ContainerList onSelect={handleCardAction} />}
        {tab === 1 && <CreateContainer onCreated={() => switchTab(0)} />}
        {tab === 2 && (
          <FillContainer
            key={preselected?.containerId || 'fill'}
            preselected={preselected}
            onDone={handleDone}
          />
        )}
        {tab === 3 && (
          <IssueFromContainer
            key={preselected?.containerId || 'issue'}
            preselected={preselected}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  )
}
