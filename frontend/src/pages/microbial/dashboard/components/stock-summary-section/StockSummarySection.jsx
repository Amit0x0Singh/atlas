import { useState } from 'react'
import { useMicrobeWiseSummary, useContainerLedger } from '../../../../../hooks/microbial/useMicrobialStockSummary.js'
import MicrobeWiseTable from './MicrobeWiseTable.jsx'
import ContainerLedgerPage from './ContainerLedgerPage.jsx'

export default function StockSummarySection() {
  const { data: microbeWise = [], isLoading: microbeWiseLoading } = useMicrobeWiseSummary()
  const { data: containers = [], isLoading: containersLoading } = useContainerLedger()
  const [ledgerFilter, setLedgerFilter] = useState(null)

  if (ledgerFilter) {
    return (
      <ContainerLedgerPage
        rows={containers}
        loading={containersLoading}
        filterSeed={ledgerFilter}
      />
    )
  }

  return (
    <div className="space-y-5">
      {microbeWiseLoading ? (
        <p className="text-center py-10 text-gray-400">Loading…</p>
      ) : (
        <MicrobeWiseTable rows={microbeWise} onViewContainers={(microbeCode, microbeType) => setLedgerFilter({ microbeCode, microbeType, ts: Date.now() })} />
      )}
    </div>
  )
}
