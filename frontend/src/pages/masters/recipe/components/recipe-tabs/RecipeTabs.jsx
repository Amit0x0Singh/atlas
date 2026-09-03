import { useEffect, useState } from 'react'
import { Plus, Trash2, Check, Pencil } from 'lucide-react'
import { Can } from '../../../../../components/common/Can.jsx'

const nameOf = (r) => r.recipeName || `Recipe ${r.recipeNo}`

// Recipe switcher for a product that can hold several recipes. `recipes` is
// [{ recipeNo, recipeName, rowCount, isDraft }], newest last.
export default function RecipeTabs({
  recipes, activeNo, activeName, onSelect, onNew, onRename, onDelete, dirty,
}) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(activeName || '')

  useEffect(() => { setDraftName(activeName || ''); setEditing(false) }, [activeNo, activeName])

  const active = recipes.find((r) => r.recipeNo === activeNo)
  const canDelete = recipes.length > 1 || (active && !active.isDraft)

  const commitRename = () => {
    setEditing(false)
    const next = draftName.trim()
    if (next !== (activeName || '')) onRename(next)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap border-b border-gray-200 bg-white px-6 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mr-1">Recipes</span>

      {recipes.map((r) => (
        <button
          key={r.recipeNo}
          type="button"
          onClick={() => onSelect(r.recipeNo)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition ${
            r.recipeNo === activeNo
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {nameOf(r)}
          {r.isDraft
            ? <span className={`text-[9px] font-bold ${r.recipeNo === activeNo ? 'text-blue-100' : 'text-amber-600'}`}>NEW</span>
            : <span className={`text-[10px] font-normal ${r.recipeNo === activeNo ? 'text-blue-100' : 'text-gray-400'}`}>· {r.rowCount}</span>}
        </button>
      ))}

      <Can permission="masters.recipe.update">
        <button
          type="button"
          onClick={onNew}
          disabled={dirty}
          title={dirty ? 'Save the current recipe first' : 'Add another recipe for this product'}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-[12px] font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40"
        >
          <Plus size={12} /> New Recipe
        </button>
      </Can>

      <div className="ml-auto flex items-center gap-2">
        {active && (
          editing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setDraftName(activeName || '') } }}
                placeholder={`Recipe ${activeNo}`}
                className="w-44 rounded-md border border-gray-300 px-2 py-1 text-[12px] outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button type="button" onClick={commitRename} className="rounded-md bg-blue-600 p-1 text-white hover:bg-blue-700">
                <Check size={13} />
              </button>
            </div>
          ) : (
            <Can permission="masters.recipe.update">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <Pencil size={12} /> Rename
              </button>
            </Can>
          )
        )}
        {active && canDelete && (
          <Can permission="masters.recipe.delete">
            <button
              type="button"
              onClick={() => onDelete(activeNo, active.isDraft)}
              title="Delete this recipe"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-red-500 hover:bg-red-50"
            >
              <Trash2 size={12} /> Delete recipe
            </button>
          </Can>
        )}
      </div>
    </div>
  )
}
