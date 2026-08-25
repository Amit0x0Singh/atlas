import { useMicrobialDashboard } from '../../../../../hooks/microbial/useMicrobialDashboard.js'
import { useStorageGrid } from '../../../../../hooks/microbial/useMicrobialStorage.js'
import KpiStrip from './KpiStrip.jsx'
import HealthScoreCard from './HealthScoreCard.jsx'
import InsightsFeed from './InsightsFeed.jsx'
import DecisionCards from './DecisionCards.jsx'
import ReorderSignalsTable from './ReorderSignalsTable.jsx'
import ConsumptionVelocityCard from './ConsumptionVelocityCard.jsx'
import AbcClassificationCard from './AbcClassificationCard.jsx'
import SlowMovingAtRiskCard from './SlowMovingAtRiskCard.jsx'
import ColdRoomUtilizationStrip from './ColdRoomUtilizationStrip.jsx'

export default function DashboardSection({ onGoToSection }) {
  const { data, isLoading } = useMicrobialDashboard()
  const { data: grid } = useStorageGrid()

  return (
    <div className="space-y-5">
      <KpiStrip data={data?.kpis} loading={isLoading} />
      {!isLoading && data && (
        <>
          <HealthScoreCard health={data.health} />
          <InsightsFeed insights={data.insights} />
          <DecisionCards decisions={data.decisions} />
          <ReorderSignalsTable rows={data.reorder_signals} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ConsumptionVelocityCard rows={data.consumption_velocity} />
            <AbcClassificationCard rows={data.abc_classification} />
            <SlowMovingAtRiskCard rows={data.slow_moving_at_risk} />
          </div>
          <ColdRoomUtilizationStrip summary={grid?.summary} onOpenStorage={() => onGoToSection('storage')} />
        </>
      )}
    </div>
  )
}
