/**
 * SubScoreBreakdown Component
 *
 * Displays the four sub-scores that compose the
 * Carbon Improvement Index:
 * 1. Awareness Score — engagement with understanding emissions
 * 2. Action Score — accepting and completing recommendations
 * 3. Consistency Score — sustained behavioral patterns
 * 4. Improvement Score — measurable emission reductions
 *
 * Each sub-score includes guidance on how to improve it,
 * making the CII actionable rather than just a number.
 *
 * Directly addresses the "measure improvement" success
 * condition with transparency about how the score works.
 */

import { getScoreColorClass, getScoreBarColorClass } from '../../utils/formatters'
import type { CIIBreakdown } from '../../types/api.types'

interface SubScoreBreakdownProps {
  breakdown: CIIBreakdown | null
  isLoading: boolean
}

interface SubScoreItem {
  key: 'awareness_score' | 'action_score' | 'consistency_score' | 'improvement_score'
  guidanceKey: 'awareness_guidance' | 'action_guidance' | 'consistency_guidance' | 'improvement_guidance'
  label: string
  icon: string
  description: string
}

const SUB_SCORES: SubScoreItem[] = [
  {
    key: 'awareness_score',
    guidanceKey: 'awareness_guidance',
    label: 'Awareness',
    icon: '🔍',
    description: 'How engaged you are with understanding your emissions',
  },
  {
    key: 'action_score',
    guidanceKey: 'action_guidance',
    label: 'Action',
    icon: '✅',
    description: 'Accepting and completing recommended actions',
  },
  {
    key: 'consistency_score',
    guidanceKey: 'consistency_guidance',
    label: 'Consistency',
    icon: '🔄',
    description: 'Sustaining sustainable behaviors over time',
  },
  {
    key: 'improvement_score',
    guidanceKey: 'improvement_guidance',
    label: 'Improvement',
    icon: '📉',
    description: 'Measurable reduction in your emissions',
  },
]

export default function SubScoreBreakdown({ breakdown, isLoading }: SubScoreBreakdownProps) {
  if (isLoading || !breakdown) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">Score Breakdown</p>
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-2 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-500 mb-1">Score Breakdown</p>
      <p className="text-xs text-slate-400 mb-5">
        Your CII combines four equally-weighted dimensions (25% each)
      </p>

      <div className="space-y-5">
        {SUB_SCORES.map((item) => {
          const score = breakdown.sub_scores[item.key]
          const guidance = breakdown[item.guidanceKey]

          return (
            <div key={item.key}>
              {/* Header Row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">{item.icon}</span>
                  <span className="text-sm font-medium text-slate-700">
                    {item.label}
                  </span>
                </div>
                <span className={`text-sm font-bold ${getScoreColorClass(score)}`}>
                  {Math.round(score)}/100
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${getScoreBarColorClass(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 mb-1">{item.description}</p>

              {/* Improvement Guidance */}
              {guidance && (
                <div className="bg-slate-50 rounded-lg p-2.5 mt-2">
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">💡 To improve: </span>
                    {guidance}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}