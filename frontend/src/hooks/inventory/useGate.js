import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gateApi } from '../../api/inventory.js'
import { queryKeys } from '../../lib/queryKeys.js'
import { CACHE } from '../../lib/queryClient.js'

function cleanParams(filters) {
  const params = { limit: 100, ...filters }
  Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
  return params
}

export function useGateInward(filters, enabled = true, options = {}) {
  return useQuery({
    queryKey: queryKeys.gate.inward(filters),
    queryFn: () => gateApi.inwardList(cleanParams(filters)).then(r => ({ rows: r.data || [], total: r.total ?? (r.data?.length ?? 0) })),
    ...CACHE.OPERATIONAL,
    enabled,
    ...options,
  })
}

export function useGateOutward(filters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.gate.outward(filters),
    queryFn: () => gateApi.outwardList(cleanParams(filters)).then(r => ({ rows: r.data || [], total: r.total ?? (r.data?.length ?? 0) })),
    ...CACHE.OPERATIONAL,
    enabled,
  })
}

export function useCreateGateInward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => gateApi.createInward(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gate-inward'] }),
  })
}

export function useCreateGateOutward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => gateApi.createOutward(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gate-outward'] }),
  })
}

export function useUpdateGateInwardStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => gateApi.updateInward(id, data),
    // Broad prefix invalidation — catches the pending-count badge query and
    // any open Gate Inward picker's list query in one go, whatever filters
    // each happens to be using.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gate-inward'] }),
  })
}

export function useEditGateInward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => gateApi.editInward(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gate-inward'] }),
  })
}

export function useEditGateOutward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => gateApi.editOutward(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gate-outward'] }),
  })
}

export function useUploadGateInwardInvoiceDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }) => gateApi.uploadInwardInvoiceDoc(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gate-inward'] }),
  })
}

export function useRequestDeleteGateInward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => gateApi.requestDeleteInward(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gate-inward'] }),
  })
}

export function useRequestDeleteGateOutward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => gateApi.requestDeleteOutward(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gate-outward'] }),
  })
}
