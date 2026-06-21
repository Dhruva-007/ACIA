/**
 * ComparisonView Component
 *
 * Displays a period-over-period comparison of carbon
 * emissions with visual difference indicators.
 *
 * Shows:
 * - Period A total (e.g., "This Month")
 * - Period B total (e.g., "Last Month")
 * - Absolute difference in kg CO₂
 * - Percentage change
 * - Per-category comparison bars
 *
 * Directly addresses the "historical comparison" feature.
 */

import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS } from '../../utils/constants'
import { formatCarbonKg, formatPercentageChange, getTrendColorClass } from '../../utils/formatters'
import type { EmissionBreakdown, EmissionCategory } from '../../types/carbon.types'

interface ComparisonData {
  periodALabel: string
  periodATotal: number
  periodABreakdown: EmissionBreakdown
  periodBLabel: string
  periodBTotal: number
  periodBBreakdown: EmissionBreakdown
}

interface ComparisonViewProps {
  data: ComparisonData | null
  isLoading: boolean
}

const CATEGORIES: EmissionCategory[] = ['transport', 'energy', 'food', 'shopping']

function getBreakdownValue(breakdown: EmissionBreakdown, category: EmissionCategory): number {
  const key = `${category}_kg` as keyof EmissionBreakdown
  return breakdown[key]
}

export default function ComparisonView({ data, isLoading }: ComparisonViewProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">Period Comparison</p>
        <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">Period Comparison</p>
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">
            Not enough data for comparison yet. Check back after a full month.
          </p>
        </div>
      </div>
    )
  }

  const differenceKg = data.periodATotal - data.periodBTotal
  const differencePercentage = data.periodBTotal > 0
    ? ((differenceKg) / data.periodBTotal) * 100
    : 0
  const improved = differenceKg < 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-500 mb-4">Period Comparison</p>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Period A */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">{data.periodALabel}</p>
          <p className="text-lg font-bold text-slate-900">
            {formatCarbonKg(data.periodATotal)}
          </p>
        </div>

        {/* Difference */}
        <div className="text-center flex flex-col items-center justify-center">
          <div
            className={`text-sm font-semibold px-3 py-1 rounded-full ${
              improved
                ? 'bg-green-100 text-green-700'
                : differenceKg > 0
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {formatPercentageChange(differencePercentage)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {improved ? 'Improved!' : differenceKg > 0 ? 'Increased' : 'No change'}
          </p>
        </div>

        {/* Period B */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-1">{data.periodBLabel}</p>
          <p className="text-lg font-bold text-slate-900">
            {formatCarbonKg(data.periodBTotal)}
          </p>
        </div>
      </div>

      {/* Category Breakdown Comparison */}
      <div className="space-y-3">
        {CATEGORIES.map((category) => {
          const valueA = getBreakdownValue(data.periodABreakdown, category)
          const valueB = getBreakdownValue(data.periodBBreakdown, category)
          const maxVal = Math.max(valueA, valueB, 1)
          const catDiffPercent = valueB > 0 ? ((valueA - valueB) / valueB) * 100 : 0

          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm" aria-hidden="true">
                    {CATEGORY_ICONS[category]}
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    {CATEGORY_LABELS[category]}
                  </span>
                </div>
                <span className={`text-xs font-medium ${getTrendColorClass(catDiffPercent)}`}>
                  {formatPercentageChange(catDiffPercent)}
                </span>
              </div>
              <div className="flex gap-1 h-3">
                {/* Period A bar */}
                <div className="flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(valueA / maxVal) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[category],
                      opacity: 0.8,
                    }}
                  />
                </div>
                {/* Period B bar */}
                <div className="flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(valueB / maxVal) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[category],
                      opacity: 0.4,
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>{data.periodALabel}: {valueA.toFixed(1)} kg</span>
                <span>{data.periodBLabel}: {valueB.toFixed(1)} kg</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}