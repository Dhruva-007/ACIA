/**
 * PredictionPage
 *
 * Future Carbon Prediction Engine page showing:
 * - Time horizon selector (6 or 12 months)
 * - Trajectory comparison metric cards
 * - Dual-line prediction chart (current vs reduction path)
 * - Plain-language prediction insights
 *
 * Directly addresses:
 * - PREDICT: future emission trajectory visualization
 * - REDUCE: motivate action by showing savings potential
 * - EXPLAIN: plain-language insight generation
 */

import { useState } from 'react'
import { useTrajectory, useTrajectoryWithRecommendations } from '../hooks/usePrediction'
import { Analytics } from '../services/analyticsService'
import PredictionChart from '../components/prediction/PredictionChart'
import TrajectoryComparison from '../components/prediction/TrajectoryComparison'
import PredictionInsight from '../components/prediction/PredictionInsight'

type Horizon = 6 | 12

export default function PredictionPage() {
  const [horizon, setHorizon] = useState<Horizon>(12)

  const trajectory = useTrajectory(horizon)
  const reductionTrajectory = useTrajectoryWithRecommendations(horizon)

  function handleHorizonChange(newHorizon: Horizon): void {
    setHorizon(newHorizon)
    Analytics.predictionViewed(newHorizon)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Carbon Prediction</h2>
          <p className="text-slate-600 mt-1">
            See how your emissions will evolve and what actions could change the trajectory
          </p>
        </div>

        {/* Horizon Selector */}
        <div
          className="inline-flex bg-slate-100 rounded-xl p-1"
          role="radiogroup"
          aria-label="Prediction horizon"
        >
          <button
            onClick={() => handleHorizonChange(6)}
            role="radio"
            aria-checked={horizon === 6}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              horizon === 6
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => handleHorizonChange(12)}
            role="radio"
            aria-checked={horizon === 12}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              horizon === 12
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            12 Months
          </button>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <span className="font-medium">🔮 How predictions work: </span>
          The <span className="text-red-600 font-medium">red dashed line</span> shows
          your projected emissions if current behavior continues.
          The <span className="text-green-600 font-medium">green line</span> shows
          projected emissions if you adopt your top recommendations.
          The gap between them represents your potential savings.
        </p>
      </div>

      {/* Summary Metrics */}
      <TrajectoryComparison
        trajectory={trajectory.data ?? null}
        reductionTrajectory={reductionTrajectory.data ?? null}
        isLoading={trajectory.isLoading}
      />

      {/* Prediction Chart */}
      <PredictionChart
        trajectory={trajectory.data?.trajectory ?? []}
        reductionPath={reductionTrajectory.data?.reduction_path ?? []}
        isLoading={trajectory.isLoading || reductionTrajectory.isLoading}
      />

      {/* Plain-Language Insights */}
      <PredictionInsight
        trajectory={trajectory.data ?? null}
        reductionTrajectory={reductionTrajectory.data ?? null}
        isLoading={trajectory.isLoading}
      />

      {/* Error State */}
      {(trajectory.isError || reductionTrajectory.isError) && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4" role="alert">
          <p className="text-sm text-red-800">
            <span className="font-medium">Unable to load predictions. </span>
            Please ensure you have enough emission history and try again.
          </p>
          <button
            onClick={() => {
              trajectory.refetch()
              reductionTrajectory.refetch()
            }}
            className="mt-2 text-sm text-red-600 font-medium hover:text-red-700"
          >
            Retry →
          </button>
        </div>
      )}
    </div>
  )
}