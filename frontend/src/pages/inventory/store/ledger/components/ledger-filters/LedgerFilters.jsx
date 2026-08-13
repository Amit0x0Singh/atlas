import { MasterFilters } from '../../../../../../components/ui'
import { useLedgerMeta } from '../../../../../../hooks/inventory/useLedger.js'
import { useOptionValues } from '../../../../../../hooks/useOptionValues.js'

const DIRECTION_OPTIONS = [
  { value: 'IN',  label: 'Stock In' },
  { value: 'OUT', label: 'Stock Out' },
]

// Stock Ledger's filter bar — item search, transaction type, date range,
// reference/batch search, warehouse, and stock direction, all server-side
// filtered (see ledger.controller.js's listLedger). Transaction-type options
// come from the backend's own canonical list (GET /ledger/meta/transaction-
// types) so this can never offer a value the ledger doesn't actually
// produce; warehouse options reuse the same admin-managed WAREHOUSE option
// group Pack Inward/Sales already source their warehouse pickers from.
export default function LedgerFilters({ values, resultCount, onChange, onClear }) {
  const { data: meta } = useLedgerMeta()
  const { data: warehouses = [] } = useOptionValues('WAREHOUSE')

  const transactionTypeOptions = (meta?.transactionTypes || []).map(t => ({ value: t.value, label: t.label }))
  const warehouseOptions = warehouses.map(w => ({ value: w.code, label: w.label }))

  return (
    <MasterFilters
      fields={[
        { key: 'search',          label: 'Item',            type: 'text',   placeholder: 'Search item code or name…' },
        { key: 'transactionType', label: 'Transaction',      type: 'select', options: transactionTypeOptions, allLabel: 'All Types' },
        { key: 'fromDate',        label: 'From Date',        type: 'date' },
        { key: 'toDate',          label: 'To Date',          type: 'date' },
        { key: 'warehouse',       label: 'Location',         type: 'select', options: warehouseOptions, allLabel: 'All Locations' },
        { key: 'reference',       label: 'Reference / Batch', type: 'text',  placeholder: 'Search batch, lot, reference…' },
        { key: 'direction',       label: 'Direction',        type: 'select', options: DIRECTION_OPTIONS, allLabel: 'All' },
      ]}
      values={values}
      resultCount={resultCount}
      onChange={onChange}
      onClear={onClear}
    />
  )
}
