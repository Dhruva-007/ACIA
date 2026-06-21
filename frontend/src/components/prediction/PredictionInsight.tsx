/**
 * PredictionInsight Component
 *
 * Translates prediction engine output into plain-language
 * insights that any user can understand.
 *
 * All values displayed in kg CO₂e with correct unit labeling.
 * Handles both the case where reduction path is meaningful
 * and where no recommendations have been adopted yet.
 *
 * Directly addresses the EXPLAIN success condition.
 */

import { formatNumber } from '../../utils/formatters'
import type { EmissionTrajectory } from '../../types/simulation.types'

interface PredictionInsightProps {
  trajectory: EmissionTrajectory | null
  reductionTrajectory: EmissionTrajectory | null
  isLoading: boolean
}

export default function PredictionInsight({
  trajectory,
  reductionTrajectory,
  isLoading,
}: PredictionInsightProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
        <div className="h-3 bg-slate-100 rounded w-full mb-2" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
    )
  }

  if (!trajectory) return null

  const horizonMonths = trajectory.horizon_months
  const currentMonthly = trajectory.current_monthly_kg

  const projectedTotal = trajectory.trajectory.reduce(
    (sum, point) => sum + point.projected_kg,
    0
  )

  const reductionTotal = reductionTrajectory
    ? reductionTrajectory.reduction_path.reduce(
        (sum, point) => sum + point.projected_kg,
        0
      )
    : null

  const potentialSaving =
    reductionTotal !== null ? projectedTotal - reductionTotal : 0

  // Guard: only show reduction insight if saving is meaningful (>5 kg)
  const hasMeaningfulSaving =
    reductionTotal !== null && potentialSaving > 5

  const trendMessage =
    trajectory.trend === 'increasing'
      ? 'Your emissions are currently trending upward.'
      : trajectory.trend === 'decreasing'
      ? 'Your emissions are currently trending downward — great progress!'
      : 'Your emissions have been relatively stable.'

  const trendColorClass =
    trajectory.trend === 'decreasing'
      ? 'bg-green-50 border-green-100 text-green-800'
      : trajectory.trend === 'increasing'
      ? 'bg-amber-50 border-amber-100 text-amber-800'
      : 'bg-slate-50 border-slate-200 text-slate-700'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-3">
        🔮 Prediction Insight
      </h3>

      <div className="space-y-4">
        {/* Trend Statement */}
        <div className={`p-4 rounded-xl border ${trendColorClass}`}>
          <p className="text-sm font-medium">{trendMessage}</p>
        </div>

        {/* Current Trajectory Insight */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            At your current pace of{' '}
            <span className="font-semibold">{currentMonthly.toFixed(1)} kg CO₂e/month</span>,
            you are projected to emit approximately{' '}
            <span className="font-semibold">
              {formatNumber(projectedTotal, 0)} kg CO₂e
            </span>{' '}
            over the next {horizonMonths} months.
          </p>
        </div>

        {/* Reduction Path Insight — only when meaningful */}
        {hasMeaningfulSaving && reductionTotal !== null ? (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-sm text-green-800 leading-relaxed">
              <span className="font-semibold">
                By adopting your top recommendations
              </span>
              , you could reduce this to approximately{' '}
              <span className="font-semibold">
                {formatNumber(reductionTotal, 0)} kg CO₂e
              </span>{' '}
              — saving{' '}
              <span className="font-semibold text-green-700">
                {formatNumber(potentialSaving, 0)} kg CO₂e
              </span>{' '}
              ({((potentialSaving / projectedTotal) * 100).toFixed(1)}%
              reduction) over {horizonMonths} months.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Accept recommendations</span> on the
              Recommendations page to see your personalized reduction path here.
            </p>
          </div>
        )}

        {/* Methodology note */}
        <p className="text-xs text-slate-400">
          Predictions are based on your current emission trend over the last 30 days
          and the estimated CO₂e impact of your accepted recommendations.
          Values are in kg CO₂e (CO₂ equivalent) per IPCC AR6 GWP100 methodology.
          Actual results may vary.
        </p>
      </div>
    </div>
  )
}