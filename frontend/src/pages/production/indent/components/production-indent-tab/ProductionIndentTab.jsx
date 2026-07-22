import IndentCard from '../indent-card/IndentCard.jsx'

export default function ProductionIndentTab({
  productList, loading, visibleIndents, selected, setSelected,
  page, totalPages, setPage,
}) {
  return (
    <>
      {productList.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-4 text-sm">
          s️ No products found. Add products in <strong>Product Master</strong> and recipes in <strong>Recipe DB</strong> first.
        </div>
      )}
      {loading ? <p className="text-gray-400">Loading...</p> : (
        <>
          <div className="space-y-3">
            {visibleIndents.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
                No production indents yet. Create one to start production.
              </div>
            ) : visibleIndents.map(indent => (
              <IndentCard key={indent.indentId} indent={indent} selected={selected} setSelected={setSelected} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">? Prev</button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          )}
        </>
      )}
    </>
  )
}
