/**
 * TrajectoryComparison Component
 *
 * Displays the key numbers from the prediction engine:
 * - Current monthly emissions
 * - Trend direction and slope
 * - Potential savings over the horizon
 * - Potential reduction percentage
 *
 * All values in kg CO₂e.
 */

import MetricCard from '../shared/MetricCard'
import {
  formatCarbonCompact,
  formatPercentageChange,
  getTrendColorClass,
} from '../../utils/formatters'
import type { EmissionTrajectory } from '../../types/simulation.types'

interface TrajectoryComparisonProps {
  trajectory: EmissionTrajectory | null
  reductionTrajectory: EmissionTrajectory | null
  isLoading: boolean
}

export default function TrajectoryComparison({
  trajectory,
  reductionTrajectory,
  isLoading,
}: TrajectoryComparisonProps) {
  if (isLoading || !trajectory) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse"
          >
            <div className="h-3 bg-slate-100 rounded w-2/3 mb-3" />
            <div className="h-6 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  const currentFormatted = formatCarbonCompact(trajectory.current_monthly_kg)

  const trendLabel =
    trajectory.trend === 'increasing'
      ? 'Emissions Rising'
      : trajectory.trend === 'decreasing'
      ? 'Emissions Falling'
      : 'Emissions Stable'

  const trendIcon =
    trajectory.trend === 'increasing'
      ? '📈'
      : trajectory.trend === 'decreasing'
      ? '📉'
      : '➡️'

  const savingsFormatted = reductionTrajectory
    ? formatCarbonCompact(reductionTrajectory.potential_total_saving_kg)
    : null

  const savingsPercentage = reductionTrajectory
    ? reductionTrajectory.potential_saving_percentage
    : 0

  // Monthly slope scaled to 30 days for trend percentage display
  const monthlySlope = trajectory.trend_slope * 30

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Current Monthly"
        value={currentFormatted[0]}
        unit={currentFormatted[1]}
        icon="📊"
      />
      <MetricCard
        label="Trend Direction"
        value={trendLabel}
        trend={monthlySlope !== 0 ? formatPercentageChange(monthlySlope) : undefined}
        trendColor={getTrendColorClass(monthlySlope)}
        icon={trendIcon}
      />
      <MetricCard
        label={`${trajectory.horizon_months}-Month Potential Savings`}
        value={savingsFormatted ? savingsFormatted[0] : '--'}
        unit={savingsFormatted ? savingsFormatted[1] : ''}
        icon="🌱"
      />
      <MetricCard
        label="Potential Reduction"
        value={savingsPercentage > 0 ? `${savingsPercentage.toFixed(1)}%` : '--'}
        icon="🎯"
      />
    </div>
  )
}