/**
 * CIIScoreCard Component
 *
 * Displays the Carbon Improvement Index score with a
 * circular progress gauge and level label.
 *
 * The gauge uses SVG for accessibility and crisp rendering.
 * Colors adapt based on score thresholds.
 */

import { getCIILevel, getCIIColorClass, getCIIStrokeColor } from '../../utils/formatters'

interface CIIScoreCardProps {
  score: number | null
  isLoading: boolean
}

export default function CIIScoreCard({ score, isLoading }: CIIScoreCardProps) {
  if (isLoading || score === null) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <p className="text-sm font-medium text-slate-500 mb-3">Carbon Improvement Index</p>
        <div className="flex items-center justify-center h-32">
          <div className="w-24 h-24 rounded-full bg-slate-100" />
        </div>
      </div>
    )
  }

  const clampedScore = Math.min(100, Math.max(0, score))
  const level = getCIILevel(clampedScore)
  const colorClass = getCIIColorClass(clampedScore)
  const strokeColor = getCIIStrokeColor(clampedScore)

  // SVG circle math
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-500 mb-3">Carbon Improvement Index</p>

      <div className="flex items-center justify-center">
        <div className="relative w-28 h-28">
          <svg
            width="112"
            height="112"
            viewBox="0 0 112 112"
            className="transform -rotate-90"
            aria-hidden="true"
          >
            {/* Background circle */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Score text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${colorClass}`}>
              {clampedScore}
            </span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
        </div>
      </div>

      <div className="text-center mt-3">
        <span className={`text-sm font-medium ${colorClass}`}>{level}</span>
      </div>
    </div>
  )
}