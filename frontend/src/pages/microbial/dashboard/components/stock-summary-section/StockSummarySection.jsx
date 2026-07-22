import { useState } from 'react'
import { useMicrobeWiseSummary, useContainerLedger } from '../../../../../hooks/microbial/useMicrobialStockSummary.js'
import MicrobeWiseTable from './MicrobeWiseTable.jsx'
import ContainerLedgerTable from './ContainerLedgerTable.jsx'

export default function StockSummarySection() {
  const { data: microbeWise = [], isLoading: microbeWiseLoading } = useMicrobeWiseSummary()
  const { data: containers = [], isLoading: containersLoading } = useContainerLedger()
  const [filterSeed, setFilterSeed] = useState(null)

  return (
    <div className="space-y-5">
      {microbeWiseLoading ? (
        <p className="text-center py-10 text-gray-400">Loading…</p>
      ) : (
        <MicrobeWiseTable rows={microbeWise} onViewContainers={(microbeCode, microbeType) => setFilterSeed({ microbeCode, microbeType, ts: Date.now() })} />
      )}
      {containersLoading ? (
        <p className="text-center py-10 text-gray-400">Loading…</p>
      ) : (
        <ContainerLedgerTable rows={containers} filterSeed={filterSeed} />
      )}
    </div>
  )
}
