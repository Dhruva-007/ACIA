/**
 * TrackingPage
 *
 * Carbon emission tracking page showing:
 * - Period selector (daily/weekly/monthly/yearly)
 * - Timeline area chart with total and breakdown modes
 * - Emission log form for manual activity tracking
 * - Period-over-period comparison
 * - Summary statistics for selected period
 *
 * All values displayed in kg CO₂e.
 *
 * Directly addresses:
 * - TRACK: Visual trends over time
 * - UNDERSTAND: Category breakdown in chart
 */

import { useState } from 'react'
import { useCarbonHistory, useCarbonSummary } from '../hooks/useCarbon'
import PeriodSelector from '../components/tracking/PeriodSelector'
import CarbonTimelineChart from '../components/tracking/CarbonTimelineChart'
import EmissionLogForm from '../components/tracking/EmissionLogForm'
import ComparisonView from '../components/tracking/ComparisonView'
import MetricCard from '../components/shared/MetricCard'
import { formatCarbonCompact } from '../utils/formatters'
import type { TimePeriod, EmissionCategory } from '../types/carbon.types'

export default function TrackingPage() {
  const [period, setPeriod] = useState<TimePeriod>('daily')
  const carbonHistory = useCarbonHistory(period)
  const carbonSummary = useCarbonSummary()

  const historyData = carbonHistory.data
  const summary = carbonSummary.data

  // Build comparison data from summary if available.
  // trend_percentage is null for new users — handle gracefully.
  const comparisonData =
    summary && summary.trend_percentage !== null
      ? {
          periodALabel: 'This Month',
          periodATotal: summary.this_month_kg,
          periodABreakdown: summary.breakdown,
          periodBLabel: 'Previous',
          periodBTotal:
            summary.this_month_kg *
            (1 + summary.trend_percentage / 100),
          periodBBreakdown: {
            transport_kg:
              summary.breakdown.transport_kg *
              (1 + summary.trend_percentage / 100),
            energy_kg:
              summary.breakdown.energy_kg *
              (1 + summary.trend_percentage / 100),
            food_kg:
              summary.breakdown.food_kg *
              (1 + summary.trend_percentage / 100),
            shopping_kg:
              summary.breakdown.shopping_kg *
              (1 + summary.trend_percentage / 100),
          },
        }
      : null

  function handleLogActivity(
    _category: EmissionCategory,
    _description: string,
    _estimatedKg: number
  ): void {
    // Activity logging will POST to backend when Phase 5 profile routes
    // include the activity log endpoint. Toast confirmation in
    // EmissionLogForm handles UX feedback in the meantime.
  }

  const averageFormatted = historyData
    ? formatCarbonCompact(historyData.average_kg)
    : null

  const totalFormatted = historyData
    ? formatCarbonCompact(historyData.total_kg)
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Carbon Tracking</h2>
          <p className="text-slate-600 mt-1">Monitor your emissions over time</p>
        </div>
        <PeriodSelector selected={period} onChange={setPeriod} />
      </div>

      {/* Summary Stats for Selected Period */}
      {historyData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label={`${period.charAt(0).toUpperCase() + period.slice(1)} Average`}
            value={averageFormatted ? averageFormatted[0] : '--'}
            unit={averageFormatted ? averageFormatted[1] : 'kg CO₂e'}
            icon="📊"
          />
          <MetricCard
            label="Total for Period"
            value={totalFormatted ? totalFormatted[0] : '--'}
            unit={totalFormatted ? totalFormatted[1] : 'kg CO₂e'}
            icon="📈"
          />
          <MetricCard
            label="Data Points"
            value={historyData.data_points.length.toString()}
            unit="records"
            icon="📋"
          />
        </div>
      )}

      {/* Timeline Chart */}
      <CarbonTimelineChart
        dataPoints={historyData?.data_points ?? []}
        isLoading={carbonHistory.isLoading}
      />

      {/* Bottom Grid: Log Form + Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmissionLogForm
          onLog={handleLogActivity}
          isSubmitting={false}
        />
        <ComparisonView
          data={comparisonData}
          isLoading={carbonSummary.isLoading}
        />
      </div>

      {/* Error State */}
      {carbonHistory.isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4" role="alert">
          <p className="text-sm text-red-800">
            <span className="font-medium">Unable to load tracking data. </span>
            {carbonHistory.error instanceof Error
              ? carbonHistory.error.message
              : 'Please try again later.'}
          </p>
          <button
            onClick={() => carbonHistory.refetch()}
            className="mt-2 text-sm text-red-600 font-medium hover:text-red-700"
          >
            Retry →
          </button>
        </div>
      )}
    </div>
  )
}