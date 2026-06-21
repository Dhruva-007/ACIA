/**
 * ActionFeedbackForm Component
 *
 * Behavioral feedback buttons for a recommendation.
 * Each action updates the Behavioral Learning Engine:
 * - Accept: increases weight (+0.15 category, +0.20 sub-type)
 * - Reject: decreases weight (-0.20 category, -0.25 sub-type)
 * - Complete: strongest positive signal (+0.25, +0.30)
 * - Failed: lighter penalty (-0.10, -0.15)
 * - Defer: no weight change
 *
 * This is the behavioral feedback loop that makes ACIA
 * an adaptive system rather than a static recommender.
 */

import type { RecommendationStatus, BehavioralAction } from '../../types/recommendation.types'

interface ActionFeedbackFormProps {
  status: RecommendationStatus
  onAction: (action: BehavioralAction) => void
  isSubmitting: boolean
}

export default function ActionFeedbackForm({
  status,
  onAction,
  isSubmitting,
}: ActionFeedbackFormProps) {
  // Show different buttons based on current status
  if (status === 'completed') {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
          ✓ Completed
        </span>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
          ✗ Did not work out
        </span>
        <button
          onClick={() => onAction('accepted')}
          disabled={isSubmitting}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
        >
          Try again
        </button>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          Declined
        </span>
        <button
          onClick={() => onAction('accepted')}
          disabled={isSubmitting}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
        >
          Reconsider
        </button>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className="flex items-center gap-2 py-1">
        <button
          onClick={() => onAction('completed')}
          disabled={isSubmitting}
          className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          ✓ Mark Complete
        </button>
        <button
          onClick={() => onAction('failed')}
          disabled={isSubmitting}
          className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          ✗ Didn't Work
        </button>
      </div>
    )
  }

  // Pending status — show accept/reject/defer
  return (
    <div className="flex items-center gap-2 py-1">
      <button
        onClick={() => onAction('accepted')}
        disabled={isSubmitting}
        className="text-xs font-medium text-white bg-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        Accept
      </button>
      <button
        onClick={() => onAction('rejected')}
        disabled={isSubmitting}
        className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
      >
        Not for me
      </button>
      <button
        onClick={() => onAction('deferred')}
        disabled={isSubmitting}
        className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1.5 transition-colors disabled:opacity-50"
      >
        Later
      </button>
    </div>
  )
}