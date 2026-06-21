/**
 * QuickActionsPanel Component
 *
 * Displays the top 3 personalized recommendations as
 * compact action cards on the dashboard.
 *
 * Each card shows:
 * - Recommendation title
 * - Category icon and label
 * - Impact badge (High/Medium/Low)
 * - Quick accept button
 *
 * Links to the full Recommendations page for details.
 */

import { useNavigate } from 'react-router-dom'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/constants'
import { formatScoreLabel } from '../../utils/formatters'
import type { Recommendation } from '../../types/recommendation.types'

interface QuickActionsPanelProps {
  recommendations: Recommendation[] | null
  isLoading: boolean
  onAccept: (id: string) => void
}

export default function QuickActionsPanel({
  recommendations,
  isLoading,
  onAccept,
}: QuickActionsPanelProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">Recommended Actions</p>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const topActions = (recommendations ?? []).slice(0, 3)

  if (topActions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">Recommended Actions</p>
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">
            Complete onboarding to receive personalized recommendations.
          </p>
        </div>
      </div>
    )
  }

  function getImpactBadgeClass(score: number): string {
    if (score >= 70) return 'bg-green-100 text-green-800'
    if (score >= 40) return 'bg-amber-100 text-amber-800'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">Recommended Actions</p>
        <button
          onClick={() => navigate('/recommendations')}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          View All →
        </button>
      </div>

      <div className="space-y-3">
        {topActions.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors duration-150"
          >
            {/* Category Icon */}
            <span className="text-xl flex-shrink-0" aria-hidden="true">
              {CATEGORY_ICONS[rec.category]}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {rec.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">
                  {CATEGORY_LABELS[rec.category]}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getImpactBadgeClass(rec.scores.carbon_impact)}`}
                >
                  {formatScoreLabel(rec.scores.carbon_impact)} Impact
                </span>
              </div>
            </div>

            {/* Accept Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAccept(rec.id)
              }}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors duration-150"
              aria-label={`Accept recommendation: ${rec.title}`}
            >
              Accept
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}