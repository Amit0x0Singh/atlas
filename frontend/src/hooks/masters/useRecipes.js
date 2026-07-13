import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { recipeApi } from '../../api/masters.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

export function useRecipe(productCode) {
  return useQuery({
    queryKey: queryKeys.recipes.all(productCode),
    queryFn: () => recipeApi.list({ productCode }).then(r => r.data),
    ...CACHE.MASTER,
    enabled: !!productCode,
  })
}

export function useBulkSaveRecipe() {
  const qc = useQueryClient()
  return useMutation({
    // recipeApi.bulkSave resolves to { success, saved } directly (not
    // wrapped in .data) — kept as-is to match the existing backend response shape.
    mutationFn: (rows) => recipeApi.bulkSave(rows),
    onSuccess: (_res, rows) => {
      const productCode = rows[0]?.productCode
      if (productCode) qc.invalidateQueries({ queryKey: queryKeys.recipes.all(productCode) })
    },
  })
}

export function useDeleteRecipeRow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => recipeApi.deleteRow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}
