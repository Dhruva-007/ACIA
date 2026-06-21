/**
 * CIIPage
 *
 * Carbon Improvement Index page showing:
 * - Large composite score gauge
 * - Four sub-score breakdowns with improvement guidance
 * - Historical CII trend chart
 * - Formula explanation
 *
 * Directly addresses:
 * - MEASURE IMPROVEMENT: single meaningful progress metric
 * - EXPLAIN: transparent scoring with guidance
 * - ADAPT: score responds to behavioral actions
 *
 * The CII transforms ACIA from a carbon calculator into
 * a measurable sustainability journey.
 */

import { useEffect } from 'react'
import { useCIICurrent, useCIIBreakdown, useCIIHistory } from '../hooks/useCII'
import { Analytics } from '../services/analyticsService'
import CIIGauge from '../components/cii/CIIGauge'
import SubScoreBreakdown from '../components/cii/SubScoreBreakdown'
import CIITrendChart from '../components/cii/CIITrendChart'

export default function CIIPage() {
  const ciiCurrent = useCIICurrent()
  const ciiBreakdown = useCIIBreakdown()
  const ciiHistory = useCIIHistory(6)

  // Track CII view for analytics
  useEffect(() => {
    if (ciiCurrent.data) {
      Analytics.ciiScoreViewed(ciiCurrent.data.composite_score)
    }
  }, [ciiCurrent.data])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Carbon Improvement Index</h2>
        <p className="text-slate-600 mt-1">
          A single score that measures your sustainability progress beyond just emissions
        </p>
      </div>

      {/* Explanation Banner */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-xl p-4">
        <p className="text-sm text-primary-800">
          <span className="font-medium">🏆 What is the CII? </span>
          Most apps only tell you your carbon footprint. The Carbon Improvement Index
          measures your entire sustainability journey — combining your Awareness,
          Action, Consistency, and Improvement into one meaningful score out of 100.
        </p>
      </div>

      {/* Top Grid: Gauge + Sub-scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CII Gauge */}
        <CIIGauge
          score={ciiCurrent.data?.composite_score ?? null}
          isLoading={ciiCurrent.isLoading}
        />

        {/* Sub-score Breakdown */}
        <SubScoreBreakdown
          breakdown={ciiBreakdown.data ?? null}
          isLoading={ciiBreakdown.isLoading}
        />
      </div>

      {/* Trend Chart */}
      <CIITrendChart
        history={ciiHistory.data ?? []}
        isLoading={ciiHistory.isLoading}
      />

      {/* Formula Explanation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          📐 How Your Score Is Calculated
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span aria-hidden="true">🔍</span>
              <span className="text-sm font-medium text-slate-700">Awareness</span>
            </div>
            <p className="text-xs text-slate-500">
              Engagement with understanding your emissions, viewing breakdowns,
              and completing your profile.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span aria-hidden="true">✅</span>
              <span className="text-sm font-medium text-slate-700">Action</span>
            </div>
            <p className="text-xs text-slate-500">
              Accepting recommendations and following through by
              completing them.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span aria-hidden="true">🔄</span>
              <span className="text-sm font-medium text-slate-700">Consistency</span>
            </div>
            <p className="text-xs text-slate-500">
              Maintaining sustainable behaviors over time rather than
              one-off actions.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span aria-hidden="true">📉</span>
              <span className="text-sm font-medium text-slate-700">Improvement</span>
            </div>
            <p className="text-xs text-slate-500">
              Measurable reduction in your actual carbon emissions
              over time.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Each dimension contributes 25% to your final score.
          The CII updates automatically as you interact with recommendations
          and your emissions change.
        </p>
      </div>

      {/* Error State */}
      {ciiCurrent.isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4" role="alert">
          <p className="text-sm text-red-800">
            <span className="font-medium">Unable to load CII data. </span>
            Please try again later.
          </p>
          <button
            onClick={() => {
              ciiCurrent.refetch()
              ciiBreakdown.refetch()
              ciiHistory.refetch()
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