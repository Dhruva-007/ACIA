/**
 * CIIGauge Component
 *
 * Large circular progress gauge for the Carbon Improvement
 * Index composite score. This is the centerpiece of the
 * CII page, larger and more detailed than the dashboard card.
 *
 * The gauge fills based on score (0-100) with color that
 * adapts to the score level (poor/fair/good/excellent).
 *
 * Accessibility:
 * - role="img" with descriptive aria-label
 * - Score and level also shown as text
 */

import { getCIILevel, getCIIColorClass, getCIIStrokeColor } from '../../utils/formatters'

interface CIIGaugeProps {
  score: number | null
  isLoading: boolean
}

export default function CIIGauge({ score, isLoading }: CIIGaugeProps) {
  if (isLoading || score === null) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center">
        <div className="w-48 h-48 rounded-full bg-slate-100 animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-24 mt-4 animate-pulse" />
      </div>
    )
  }

  const clampedScore = Math.min(100, Math.max(0, score))
  const level = getCIILevel(clampedScore)
  const colorClass = getCIIColorClass(clampedScore)
  const strokeColor = getCIIStrokeColor(clampedScore)

  // SVG circle math for large gauge
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center">
      <p className="text-sm font-medium text-slate-500 mb-6">
        Carbon Improvement Index
      </p>

      <div
        className="relative w-52 h-52"
        role="img"
        aria-label={`Carbon Improvement Index score: ${clampedScore} out of 100, rated ${level}`}
      >
        <svg
          width="208"
          height="208"
          viewBox="0 0 208 208"
          className="transform -rotate-90"
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle
            cx="104"
            cy="104"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="14"
          />
          {/* Progress circle */}
          <circle
            cx="104"
            cy="104"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold ${colorClass}`}>
            {clampedScore}
          </span>
          <span className="text-sm text-slate-400">out of 100</span>
        </div>
      </div>

      {/* Level Label */}
      <div className="mt-6 text-center">
        <span className={`text-lg font-semibold ${colorClass}`}>{level}</span>
        <p className="text-xs text-slate-400 mt-1">
          Your sustainability journey rating
        </p>
      </div>

      {/* Scale Reference */}
      <div className="flex items-center justify-between w-full max-w-xs mt-6 text-xs text-slate-400">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <div className="flex w-full max-w-xs h-1.5 rounded-full overflow-hidden mt-1">
        <div className="flex-1 bg-red-300" />
        <div className="flex-1 bg-amber-300" />
        <div className="flex-1 bg-blue-300" />
        <div className="flex-1 bg-green-400" />
      </div>
    </div>
  )
}