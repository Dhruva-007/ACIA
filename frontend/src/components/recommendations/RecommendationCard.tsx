/**
 * RecommendationCard Component
 *
 * Displays a single personalized recommendation with:
 * - Category icon and label
 * - Title and description
 * - Impact metrics (monthly/annual kg CO₂ reduction)
 * - Compact five-dimension score bars
 * - Reasoning preview with "View Details" link
 * - Behavioral feedback action buttons
 *
 * Each card makes the system's intelligence visible:
 * the user can see WHY this recommendation was chosen
 * and HOW it was scored across five dimensions.
 */

import { useState } from 'react'
import ScoreBreakdown from './ScoreBreakdown'
import ActionFeedbackForm from './ActionFeedbackForm'
import ReasoningModal from './ReasoningModal'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/constants'
import { formatScoreLabel } from '../../utils/formatters'
import type { Recommendation, BehavioralAction } from '../../types/recommendation.types'

interface RecommendationCardProps {
  recommendation: Recommendation
  onAction: (recommendationId: string, action: BehavioralAction) => void
  isSubmitting: boolean
}

export default function RecommendationCard({
  recommendation,
  onAction,
  isSubmitting,
}: RecommendationCardProps) {
  const [showReasoning, setShowReasoning] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const impactLevel = formatScoreLabel(recommendation.scores.carbon_impact)

  function getImpactBadgeClass(): string {
    if (recommendation.scores.carbon_impact >= 70) return 'bg-green-100 text-green-800'
    if (recommendation.scores.carbon_impact >= 40) return 'bg-amber-100 text-amber-800'
    return 'bg-slate-100 text-slate-600'
  }

  function getStatusBorderClass(): string {
    switch (recommendation.status) {
      case 'accepted': return 'border-l-primary-500'
      case 'completed': return 'border-l-green-500'
      case 'rejected': return 'border-l-slate-300'
      case 'failed': return 'border-l-red-400'
      default: return 'border-l-transparent'
    }
  }

  return (
    <>
      <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden transition-shadow duration-200 hover:shadow-md border-l-4 ${getStatusBorderClass()}`}>
        <div className="p-5">
          {/* Top Row: Category + Impact Badge + Score */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl" aria-hidden="true">
                {CATEGORY_ICONS[recommendation.category]}
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {recommendation.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {CATEGORY_LABELS[recommendation.category]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getImpactBadgeClass()}`}>
                {impactLevel} Impact
              </span>
              <span className="text-sm font-bold text-slate-700">
                {Math.round(recommendation.composite_score)}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 mb-3 leading-relaxed">
            {recommendation.description}
          </p>

          {/* Impact Metrics Row */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Monthly:</span>
              <span className="text-sm font-semibold text-green-600">
                -{recommendation.monthly_kg_reduction.toFixed(1)} kg
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Annual:</span>
              <span className="text-sm font-semibold text-green-600">
                -{recommendation.annual_kg_reduction.toFixed(0)} kg
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Reduction:</span>
              <span className="text-sm font-semibold text-green-600">
                {recommendation.impact_percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Reasoning Preview */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
            <p className="text-xs text-blue-700 leading-relaxed line-clamp-2">
              💡 {recommendation.reasoning}
            </p>
            <button
              onClick={() => setShowReasoning(true)}
              className="text-xs text-blue-600 font-medium hover:text-blue-700 mt-1"
            >
              View full reasoning & scoring →
            </button>
          </div>

          {/* Expandable Score Breakdown */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1"
          >
            <span>{expanded ? '▼' : '▶'}</span>
            {expanded ? 'Hide scores' : 'Show score breakdown'}
          </button>

          {expanded && (
            <div className="mb-3 animate-fade-in">
              <ScoreBreakdown scores={recommendation.scores} compact />
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-slate-100 pt-3 mt-1">
            <ActionFeedbackForm
              status={recommendation.status}
              onAction={(action) => onAction(recommendation.id, action)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Reasoning Modal */}
      {showReasoning && (
        <ReasoningModal
          recommendation={recommendation}
          onClose={() => setShowReasoning(false)}
        />
      )}
    </>
  )
}