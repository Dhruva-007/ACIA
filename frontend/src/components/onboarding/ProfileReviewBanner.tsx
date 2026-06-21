/**
 * ProfileReviewBanner Component — Section 1: Adaptive Re-Onboarding
 *
 * Non-intrusive banner that appears on the Dashboard when
 * profile_review_due is true (30 days since last update).
 *
 * Prompts the user to do a quick lifestyle review to keep
 * their carbon footprint calculation accurate.
 *
 * Designed to be dismissible without guilt and re-appear
 * after the next review interval.
 */

interface ProfileReviewBannerProps {
  onStartReview: () => void
  onDismiss: () => void
  daysSinceLastReview: number
}

export default function ProfileReviewBanner({
  onStartReview,
  onDismiss,
  daysSinceLastReview,
}: ProfileReviewBannerProps) {
  return (
    <div
      className="bg-amber-50 border border-amber-200 rounded-xl p-4"
      role="alert"
      aria-labelledby="review-banner-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p
            id="review-banner-title"
            className="text-sm font-medium text-amber-800"
          >
            📋 Profile Review Due
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Your lifestyle inputs haven&apos;t been updated in {daysSinceLastReview} days.
            A quick 60-second review ensures your carbon footprint stays accurate
            as your habits evolve.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onStartReview}
            className="text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Update Profile
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-amber-500 hover:text-amber-700 p-1.5 rounded-lg transition-colors"
            aria-label="Dismiss profile review reminder"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}