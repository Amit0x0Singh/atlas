import prisma from '../../../db.js'

// The recipe a downstream flow should use for a product until that flow
// grows its own recipe selector: the "primary" one — the lowest recipe_no
// present. For every product that only has one recipe this is just 1, so
// callers adding `recipeNo: await primaryRecipeNo(code)` to their where
// clause change nothing until a product actually gets a second recipe.
export async function primaryRecipeNo(productCode, client = prisma) {
  const row = await client.recipeDb.findFirst({
    where: { productCode },
    orderBy: { recipeNo: 'asc' },
    select: { recipeNo: true },
  })
  return row?.recipeNo ?? 1
}

// Recomputes ProductMaster.totalRecipe from the distinct recipe numbers a
// product actually has in RecipeDb — call after any create/update/delete
// that could change how many recipes a product owns.
export async function syncTotalRecipe(productCode) {
  const recipes = await prisma.recipeDb.findMany({
    where: { productCode },
    select: { recipeNo: true },
    distinct: ['recipeNo'],
  })
  await prisma.productMaster.update({
    where: { productCode },
    data: { totalRecipe: recipes.length },
  })
}
