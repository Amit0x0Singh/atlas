import { BookOpen, Check, AlertTriangle } from 'lucide-react'
import { SectionHeader } from './formPrimitives.jsx'

const nameOf = (r) => r.recipeName || `Recipe ${r.recipeNo}`

// Standalone card for choosing which of a product's recipes to issue —
// pulled out of BatchDetailsForm so it isn't cramped directly under the
// Product Name field. The BOM Components table below is filled straight
// from the recipe picked here and is read-only.
export default function RecipeSelector({
  productName, productRecipes = [], selectedRecipeNo, onPickRecipe, recipeLoadedMsg, showNoRecipeWarning,
}) {
  if (!productName?.trim()) return null

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <SectionHeader icon={BookOpen} title="Recipe" description="Which recipe of this product to issue — components are loaded from here" />

      {showNoRecipeWarning ? (
        <div className="flex items-start gap-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            No recipe found for “{productName.trim()}” in the Recipe Master. Check the spelling, or add its BOM
            in the Recipe page first — a BOM can only be issued from a stored recipe.
          </span>
        </div>
      ) : productRecipes.length === 0 ? (
        <p className="text-[12px] text-slate-400">Select a product above to load its recipe.</p>
      ) : (
        <>
          {productRecipes.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {productRecipes.map((r) => {
                const active = r.recipeNo === selectedRecipeNo
                return (
                  <button
                    key={r.recipeNo}
                    type="button"
                    onClick={() => onPickRecipe(r.recipeNo)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {active && <Check size={12} />}
                    {nameOf(r)}
                    <span className={`text-[10px] font-normal ${active ? 'text-indigo-100' : 'text-slate-400'}`}>
                      · {r.lines.length} item{r.lines.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {recipeLoadedMsg && (
            <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <Check size={13} /> {recipeLoadedMsg.replace(/^✓\s*/, '')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
