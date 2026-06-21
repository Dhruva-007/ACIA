/**
 * Display Formatters
 *
 * Pure functions for formatting data for display.
 * All functions are side-effect free and fully testable.
 *
 * All carbon units use CO₂e (CO₂ equivalent) notation
 * to reflect scientifically correct greenhouse gas accounting
 * per IPCC AR6 GWP100 methodology.
 */

import { CII_THRESHOLDS, CII_LEVEL_LABELS, SCORE_THRESHOLDS } from './constants'

// ─── Carbon Values ────────────────────────────────────────────────────────

/**
 * Formats a carbon value in kg CO₂e with appropriate precision.
 * Values under 1 kg show as grams. Values over 1000 kg show as tonnes.
 *
 * @param kg - Carbon value in kilograms CO₂e
 * @returns Formatted string with CO₂e unit
 *
 * @example
 * formatCarbonKg(2.456)  → "2.46 kg CO₂e"
 * formatCarbonKg(0.234)  → "234 g CO₂e"
 * formatCarbonKg(1250)   → "1.25 t CO₂e"
 */
export function formatCarbonKg(kg: number): string {
  if (kg < 1) {
    return `${Math.round(kg * 1000)} g CO₂e`
  }
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} t CO₂e`
  }
  return `${kg.toFixed(2)} kg CO₂e`
}

/**
 * Formats a carbon value with a compact label for dashboard cards.
 *
 * @param kg - Carbon value in kilograms CO₂e
 * @returns Tuple of [value string, unit string]
 *
 * @example
 * formatCarbonCompact(12.5)  → ["12.50", "kg CO₂e"]
 * formatCarbonCompact(1500)  → ["1.50", "t CO₂e"]
 */
export function formatCarbonCompact(kg: number): [string, string] {
  if (kg >= 1000) {
    return [(kg / 1000).toFixed(2), 't CO₂e']
  }
  return [kg.toFixed(2), 'kg CO₂e']
}

/**
 * Formats a percentage change with sign and direction arrow.
 *
 * @param percentage - Percentage value (positive = increase)
 * @param inverted   - If true (default), the metric is one where
 *                     an increase is undesirable (e.g. emissions).
 *                     The arrow reflects numerical direction;
 *                     callers use getTrendColorClass for coloring.
 * @returns Formatted string
 *
 * @example
 * formatPercentageChange(12.5)   → "+12.5% ↑"
 * formatPercentageChange(-8.3)   → "-8.3% ↓"
 * formatPercentageChange(0)      → "0.0% →"
 */
export function formatPercentageChange(percentage: number, inverted = true): string {
  const sign = percentage > 0 ? '+' : ''
  const arrow = percentage > 0 ? '↑' : percentage < 0 ? '↓' : '→'
  // inverted is preserved in the signature for callers that pass it
  // for semantic documentation; arrow direction is always numerical.
  void inverted
  return `${sign}${percentage.toFixed(1)}% ${arrow}`
}

/**
 * Formats a trend for display, handling the "new_user" state
 * where no comparison data is available yet.
 *
 * @param trend           - Trend direction or 'new_user'
 * @param trendPercentage - Percentage change (null for new_user)
 * @param trendMessage    - Contextual message for new_user state
 * @returns Formatted display string
 */
export function formatTrendDisplay(
  trend: 'increasing' | 'stable' | 'decreasing' | 'new_user' | string,
  trendPercentage: number | null | undefined,
  trendMessage?: string,
): string {
  if (trend === 'new_user' || trendPercentage === null || trendPercentage === undefined) {
    return trendMessage ?? 'Track for 7 days to see your trend'
  }
  return formatPercentageChange(trendPercentage)
}

/**
 * Returns Tailwind color class for a percentage change on emissions.
 * For emissions: decrease (negative) is good (green), increase is bad (red).
 */
export function getTrendColorClass(percentage: number): string {
  if (percentage < -2) return 'text-green-600'
  if (percentage > 2) return 'text-red-500'
  return 'text-amber-500'
}

/**
 * Returns Tailwind color class for a trend state including new_user.
 */
export function getTrendColorClassFromState(
  trend: 'increasing' | 'stable' | 'decreasing' | 'new_user' | string,
  percentage: number | null | undefined,
): string {
  if (trend === 'new_user' || percentage === null || percentage === undefined) {
    return 'text-slate-400'
  }
  return getTrendColorClass(percentage)
}

/**
 * Formats a comparison against the global average.
 *
 * @param vsGlobalAvgPercentage - Percentage vs global average (positive = above)
 * @returns Formatted comparison string
 *
 * @example
 * formatVsGlobalAverage(6.2)   → "6.2% above global average"
 * formatVsGlobalAverage(-12.5) → "12.5% below global average"
 */
export function formatVsGlobalAverage(vsGlobalAvgPercentage: number): string {
  const abs = Math.abs(vsGlobalAvgPercentage)
  const direction = vsGlobalAvgPercentage >= 0 ? 'above' : 'below'
  return `${abs.toFixed(1)}% ${direction} global average`
}

// ─── Scores ───────────────────────────────────────────────────────────────

/**
 * Returns a label for a recommendation score value.
 *
 * @param score - Score from 0 to 100
 * @returns Human-readable label
 */
export function formatScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'High'
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'Medium'
  return 'Low'
}

/**
 * Returns Tailwind color class for a score value.
 * Higher score = better = green.
 */
export function getScoreColorClass(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'text-green-600'
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'text-amber-500'
  return 'text-red-500'
}

/**
 * Returns Tailwind background color class for a score progress bar.
 */
export function getScoreBarColorClass(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'bg-green-500'
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'bg-amber-400'
  return 'bg-red-400'
}

// ─── CII ──────────────────────────────────────────────────────────────────

/**
 * Returns the level label for a CII composite score.
 */
export function getCIILevel(score: number): string {
  if (score >= CII_THRESHOLDS.EXCELLENT) return CII_LEVEL_LABELS.EXCELLENT
  if (score >= CII_THRESHOLDS.GOOD) return CII_LEVEL_LABELS.GOOD
  if (score >= CII_THRESHOLDS.FAIR) return CII_LEVEL_LABELS.FAIR
  return CII_LEVEL_LABELS.POOR
}

/**
 * Returns Tailwind color class for a CII score.
 */
export function getCIIColorClass(score: number): string {
  if (score >= CII_THRESHOLDS.EXCELLENT) return 'text-green-600'
  if (score >= CII_THRESHOLDS.GOOD) return 'text-blue-600'
  if (score >= CII_THRESHOLDS.FAIR) return 'text-amber-500'
  return 'text-red-500'
}

/**
 * Returns SVG stroke color for the CII gauge circle.
 */
export function getCIIStrokeColor(score: number): string {
  if (score >= CII_THRESHOLDS.EXCELLENT) return '#16a34a'
  if (score >= CII_THRESHOLDS.GOOD) return '#2563eb'
  if (score >= CII_THRESHOLDS.FAIR) return '#f59e0b'
  return '#ef4444'
}

// ─── Budget ───────────────────────────────────────────────────────────────

/**
 * Returns a status label and color for carbon budget usage.
 *
 * @param percentageUsed - Budget used as percentage (0-100+)
 * @returns Object with label and Tailwind color class
 */
export function formatBudgetStatus(percentageUsed: number): {
  label: string
  colorClass: string
  barColorClass: string
} {
  if (percentageUsed <= 80) {
    return { label: 'On Track', colorClass: 'text-green-600', barColorClass: 'bg-green-500' }
  }
  if (percentageUsed <= 100) {
    return { label: 'Close to Limit', colorClass: 'text-amber-600', barColorClass: 'bg-amber-400' }
  }
  return { label: 'Over Budget', colorClass: 'text-red-600', barColorClass: 'bg-red-500' }
}

// ─── Dates ────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string for display.
 *
 * @example
 * formatDate("2024-01-15") → "Jan 15, 2024"
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats an ISO date string for chart axis labels.
 *
 * @example
 * formatDateShort("2024-01-15") → "Jan 15"
 */
export function formatDateShort(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats a YYYY-MM month string for display.
 *
 * @example
 * formatMonth("2024-01") → "January 2024"
 */
export function formatMonth(monthString: string): string {
  const [year, month] = monthString.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })
}

/**
 * Returns a relative time string for a timestamp.
 *
 * @example
 * formatRelativeTime("2024-01-15T10:00:00Z") → "2 hours ago"
 */
export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

// ─── Numbers ──────────────────────────────────────────────────────────────

/**
 * Formats a number with locale-aware comma separators.
 *
 * @example
 * formatNumber(1234567)    → "1,234,567"
 * formatNumber(12.5, 1)   → "12.5"
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Clamps a number between min and max inclusive.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}