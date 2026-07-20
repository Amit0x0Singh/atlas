import prisma from '../../../db.js'

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
