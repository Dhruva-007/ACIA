/**
 * PeriodSelector Component
 *
 * Toggle button group for selecting the time period
 * for carbon emission history display.
 *
 * Accessibility:
 * - Uses role="radiogroup" for screen readers
 * - Each button has role="radio" with aria-checked
 * - Keyboard navigable with focus styles
 */

import { TIME_PERIOD_LABELS } from '../../utils/constants'
import type { TimePeriod } from '../../types/carbon.types'

interface PeriodSelectorProps {
  selected: TimePeriod
  onChange: (period: TimePeriod) => void
}

const PERIODS: TimePeriod[] = ['daily', 'weekly', 'monthly', 'yearly']

export default function PeriodSelector({ selected, onChange }: PeriodSelectorProps) {
  return (
    <div
      className="inline-flex bg-slate-100 rounded-xl p-1"
      role="radiogroup"
      aria-label="Select time period"
    >
      {PERIODS.map((period) => {
        const isActive = period === selected

        return (
          <button
            key={period}
            onClick={() => onChange(period)}
            role="radio"
            aria-checked={isActive}
            className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TIME_PERIOD_LABELS[period]}
          </button>
        )
      })}
    </div>
  )
}