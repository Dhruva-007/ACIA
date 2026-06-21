/**
 * CarbonSummaryCard Component
 *
 * Displays a single carbon metric for a time period with:
 * - Formatted CO₂e value
 * - Trend indicator (handles new_user state gracefully)
 * - Optional benchmark context vs global average
 *
 * The new_user trend state replaces the misleading 0.0% display
 * that appeared for users with fewer than 7 days of data.
 */

import MetricCard from '../shared/MetricCard'
import {
  formatCarbonCompact,
  formatTrendDisplay,
  getTrendColorClassFromState,
  formatVsGlobalAverage,
} from '../../utils/formatters'
import type { TrendState } from '../../types/carbon.types'

interface CarbonSummaryCardProps {
  /** Display label for the time period */
  label: string
  /** Carbon value in kg CO₂e, or null when loading */
  valueKg: number | null
  /** Trend direction state */
  trend?: TrendState
  /** Percentage change vs previous period. Null for new_user trend. */
  trendPercentage?: number | null
  /** Human-readable message for new_user trend state */
  trendMessage?: string
  /** Percentage vs global average (positive = above average) */
  vsGlobalAverage?: number
  /** Emoji icon for the card */
  icon: string
  /** Whether data is still loading */
  isLoading: boolean
}

export default function CarbonSummaryCard({
  label,
  valueKg,
  trend,
  trendPercentage,
  trendMessage,
  vsGlobalAverage,
  icon,
  isLoading,
}: CarbonSummaryCardProps) {
  if (isLoading || valueKg === null) {
    return (
      <MetricCard
        label={label}
        value="--"
        unit="kg CO₂e"
        icon={icon}
        className="animate-pulse"
      />
    )
  }

  const [formattedValue, unit] = formatCarbonCompact(valueKg)

  // Resolve trend display — never show raw 0.0% for new users
  const trendDisplay =
    trend && (trendPercentage !== undefined || trend === 'new_user')
      ? formatTrendDisplay(trend, trendPercentage ?? null, trendMessage)
      : undefined

  const trendColor =
    trend
      ? getTrendColorClassFromState(trend, trendPercentage ?? null)
      : undefined

  // Build secondary context line for benchmark comparison
  const contextLine =
    vsGlobalAverage !== undefined
      ? formatVsGlobalAverage(vsGlobalAverage)
      : undefined

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-slate-900">{formattedValue}</span>
        <span className="text-sm text-slate-500">{unit}</span>
        {icon && <span className="text-xl ml-auto" aria-hidden="true">{icon}</span>}
      </div>

      {/* Trend display */}
      {trendDisplay && (
        <p className={`text-sm mt-1 ${trendColor ?? 'text-slate-400'}`}>
          {trendDisplay}
        </p>
      )}

      {/* Global average context */}
      {contextLine && (
        <p className={`text-xs mt-1 ${
          (vsGlobalAverage ?? 0) < 0 ? 'text-green-600' : 'text-slate-400'
        }`}>
          {contextLine}
        </p>
      )}
    </div>
  )
}