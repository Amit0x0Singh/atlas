import { Button } from "../../../../../../components/ui";

export default function PackTableToolbar({
  loading, pendingGroups, completedGroups, allGroups, packs,
  showCompleted, setShowCompleted,
  onExpandAll, onCollapseAll,
}) {
  return (
    <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900">Pack Records</h2>
        {!loading && (
          <>
            {pendingGroups.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                {pendingGroups.length} pending
              </span>
            )}
            {completedGroups.length > 0 && (
              <button
                onClick={() => setShowCompleted(v => !v)}
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition ${
                  showCompleted
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {showCompleted ? '✓' : ''} {completedGroups.length} completed {showCompleted ? '(showing)' : '(hidden)'}
              </button>
            )}
            {pendingGroups.length === 0 && completedGroups.length === 0 && (
              <span className="text-xs text-gray-400">{allGroups.length} groups · {packs.length} bags</span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="xs" onClick={onExpandAll}>Expand all</Button>
        <Button variant="outline-gray" size="xs" onClick={onCollapseAll}>Collapse all</Button>
      </div>
    </div>
  );
}
