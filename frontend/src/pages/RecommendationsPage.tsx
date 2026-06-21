/**
 * RecommendationsPage
 *
 * Displays personalized adaptive recommendations with:
 * - Ranked recommendation cards
 * - Five-dimension scoring visualization
 * - Reasoning explanation for each recommendation
 * - Behavioral feedback buttons (accept/reject/complete/fail)
 * - Behavioral weights transparency panel
 *
 * Directly addresses:
 * - REDUCE: actionable personalized recommendations
 * - ADAPT: behavioral feedback loop
 * - Smart dynamic assistant: visible learning system
 * - Logical decision making: scoring transparency
 */

import toast from 'react-hot-toast'
import { useRecommendationsList, useBehaviorFeedback, useBehavioralWeights } from '../hooks/useRecommendations'
import RecommendationList from '../components/recommendations/RecommendationList'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/constants'
import type { BehavioralAction, BehavioralWeights } from '../types/recommendation.types'
import type { EmissionCategory } from '../types/carbon.types'

const WEIGHT_CATEGORIES: EmissionCategory[] = ['transport', 'energy', 'food', 'shopping']

function WeightsPanel({ weights }: { weights: BehavioralWeights | undefined }) {
  if (!weights) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-medium text-slate-700 mb-3">
        🧠 Behavioral Learning State
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        These weights show how the system has learned your preferences.
        Higher weight means more recommendations from that category.
      </p>
      <div className="space-y-3">
        {WEIGHT_CATEGORIES.map((category) => {
          const weight = weights[category]
          const percentage = weight * 100

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
                <span className="text-xs font-medium text-slate-700">
                  {percentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentage >= 60 ? 'bg-green-400' :
                    percentage >= 30 ? 'bg-amber-400' :
                    'bg-red-400'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {percentage < 30 && (
                <p className="text-xs text-red-400 mt-0.5">
                  Low priority — you&apos;ve declined most {CATEGORY_LABELS[category].toLowerCase()} suggestions
                </p>
              )}
            </div>
          )
        })}
      </div>

      {weights.updated_at && (
        <p className="text-xs text-slate-300 mt-4">
          Last updated: {new Date(weights.updated_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

export default function RecommendationsPage() {
  const recommendations = useRecommendationsList(10)
  const behavioralWeights = useBehavioralWeights()
  const feedbackMutation = useBehaviorFeedback()

  function handleAction(recommendationId: string, action: BehavioralAction): void {
    feedbackMutation.mutate(
      { recommendation_id: recommendationId, action },
      {
        onSuccess: (result) => {
          const messages: Record<BehavioralAction, string> = {
            accepted: 'Recommendation accepted! We\'ll track your progress. 🌱',
            rejected: 'Got it. We\'ll show you different alternatives.',
            completed: 'Excellent! Action completed. Your CII score has been updated! 🎉',
            failed: 'No worries. We\'ll suggest easier alternatives.',
            deferred: 'Saved for later.',
          }
          toast.success(result.message || messages[action])
        },
        onError: () => {
          toast.error('Failed to submit feedback. Please try again.')
        },
      },
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Recommendations</h2>
        <p className="text-slate-600 mt-1">
          Personalized actions ranked by impact and your likelihood of success
        </p>
      </div>

      {/* Explanation Banner */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-xl p-4">
        <p className="text-sm text-primary-800">
          <span className="font-medium">🎯 How scoring works: </span>
          Each recommendation is evaluated across five dimensions — Carbon Impact (30%),
          Success Probability (35%), Affordability (15%), Convenience (10%), and
          Lifestyle Match (10%). Success Probability has the highest weight because
          a recommendation you won&apos;t follow achieves zero carbon reduction.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recommendation List - 2 columns */}
        <div className="xl:col-span-2">
          <RecommendationList
            recommendations={recommendations.data ?? []}
            isLoading={recommendations.isLoading}
            onAction={handleAction}
            isSubmitting={feedbackMutation.isPending}
          />
        </div>

        {/* Behavioral Weights Panel - 1 column */}
        <div>
          <WeightsPanel weights={behavioralWeights.data} />
        </div>
      </div>

      {/* Error State */}
      {recommendations.isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4" role="alert">
          <p className="text-sm text-red-800">
            <span className="font-medium">Unable to load recommendations. </span>
            {recommendations.error instanceof Error
              ? recommendations.error.message
              : 'Please try again.'}
          </p>
          <button
            onClick={() => recommendations.refetch()}
            className="mt-2 text-sm text-red-600 font-medium hover:text-red-700"
          >
            Retry →
          </button>
        </div>
      )}
    </div>
  )
}