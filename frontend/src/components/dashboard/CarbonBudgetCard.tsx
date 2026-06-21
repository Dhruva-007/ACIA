/**
 * CarbonBudgetCard Component — Feature 2: Carbon Budget System
 *
 * Displays the user's monthly carbon budget progress as a
 * visual progress bar with status indicator.
 *
 * The budget metaphor makes abstract emission numbers concrete:
 * every person understands a budget running out.
 *
 * Budget = current monthly footprint × 0.90 (10% reduction target)
 * All values in kg CO₂e.
 */

import { useCarbonBudget } from '../../hooks/useCarbon'
import { formatBudgetStatus, clamp } from '../../utils/formatters'

export default function CarbonBudgetCard() {
  const budget = useCarbonBudget()

  if (budget.isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
        <div className="h-4 bg-slate-100 rounded w-full mb-2" />
        <div className="h-2 bg-slate-100 rounded w-full" />
      </div>
    )
  }

  if (budget.isError || !budget.data) {
    return null
  }

  const data = budget.data
  const { label, colorClass, barColorClass } = formatBudgetStatus(data.percentage_used)
  const barWidth = clamp(data.percentage_used, 0, 100)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">Monthly Budget</p>
        <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
      </div>

      {/* Budget numbers */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-slate-900">
          {data.used_kg.toFixed(1)}
        </span>
        <span className="text-sm text-slate-400">
          / {data.budget_kg.toFixed(1)} kg CO₂e
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3"
        role="progressbar"
        aria-valuenow={data.percentage_used}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Carbon budget: ${data.percentage_used.toFixed(0)}% used`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColorClass}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Context */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{data.days_remaining} days remaining</span>
        <span>{data.percentage_used.toFixed(0)}% used</span>
      </div>

      {/* Budget status message */}
      <p className="text-xs text-slate-500 mt-2">
        {data.status === 'on_track' && (
          <>✓ You&apos;re on track for a 10% emission reduction this month.</>
        )}
        {data.status === 'slightly_over' && (
          <>⚠️ Slightly over budget. Try accepting a recommendation to get back on track.</>
        )}
        {data.status === 'significantly_over' && (
          <>🚨 Significantly over budget. Visit Recommendations for high-impact actions.</>
        )}
      </p>
    </div>
  )
}