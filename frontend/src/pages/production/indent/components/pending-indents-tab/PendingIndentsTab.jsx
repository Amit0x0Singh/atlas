import IndentCard from '../indent-card/IndentCard.jsx'

export default function PendingIndentsTab({ loading, visibleIndents, selected, setSelected }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Pending Indents</h2>
        <p className="text-sm text-gray-500">Indents waiting for stock. Auto-activate when missing RMs are inwarded.</p>
      </div>
      {loading ? <p className="text-gray-400">Loading...</p>
        : visibleIndents.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
            o. No pending indents. All indents have sufficient stock.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleIndents.map(indent => (
              <IndentCard key={indent.indentId} indent={indent} selected={selected} setSelected={setSelected} />
            ))}
          </div>
        )
      }
    </div>
  )
}
