/**
 * Analytics Service
 *
 * Wraps Firebase Analytics for tracking user behavior events.
 * All analytics calls are fire-and-forget — they never block
 * UI operations and never throw errors to the caller.
 *
 * No PII is ever sent to analytics. Only behavioral signals
 * and category-level information.
 */

import { logEvent } from 'firebase/analytics'
import { analyticsPromise } from '../config/firebase'
import type { EmissionCategory } from '../types/carbon.types'
import type { BehavioralAction } from '../types/recommendation.types'

// ─── Safe Analytics Logger ────────────────────────────────────────────────

/**
 * Safely logs a Firebase Analytics event.
 * Silently ignores failures so analytics never disrupts UX.
 */
async function track(eventName: string, params?: Record<string, string | number | boolean>): Promise<void> {
  try {
    const analytics = await analyticsPromise
    if (analytics) {
      logEvent(analytics, eventName, params)
    }
  } catch {
    // Analytics errors are always silently swallowed
    // They must never affect user experience
  }
}

// ─── User Lifecycle Events ────────────────────────────────────────────────

export const Analytics = {
  onboardingStarted: () =>
    track('onboarding_started'),

  onboardingCompleted: (timeSeconds: number) =>
    track('onboarding_completed', { time_to_complete_seconds: timeSeconds }),

  profileUpdated: () =>
    track('profile_updated'),

  // ─── Carbon Events ──────────────────────────────────────────────────────

  carbonBreakdownViewed: (primaryCategory: EmissionCategory) =>
    track('carbon_breakdown_viewed', { primary_category: primaryCategory }),

  categoryExplanationExpanded: (category: EmissionCategory) =>
    track('category_explanation_expanded', { category }),

  // ─── Recommendation Events ───────────────────────────────────────────────

  recommendationsViewed: (count: number) =>
    track('recommendations_viewed', { count }),

  recommendationAction: (action: BehavioralAction, category: EmissionCategory, impactLevel: string) =>
    track(`recommendation_${action}`, {
      category,
      impact_level: impactLevel,
    }),

  // ─── Simulator Events ────────────────────────────────────────────────────

  simulationRun: (scenarioType: string) =>
    track('simulation_run', { scenario_type: scenarioType }),

  simulationComparisonViewed: () =>
    track('simulation_comparison_viewed'),

  // ─── Assistant Events ────────────────────────────────────────────────────

  assistantMessageSent: (sessionLength: number) =>
    track('assistant_message_sent', { session_length: sessionLength }),

  // ─── CII Events ──────────────────────────────────────────────────────────

  ciiScoreViewed: (score: number) => {
    const range =
      score <= 25 ? '0-25' :
      score <= 50 ? '26-50' :
      score <= 75 ? '51-75' : '76-100'
    track('cii_score_viewed', { score_range: range })
  },

  // ─── Prediction Events ────────────────────────────────────────────────────

  predictionViewed: (horizonMonths: number) =>
    track('prediction_viewed', { horizon_months: horizonMonths }),
  
  // ─── Streak Events (Feature 1) ────────────────────────────────────────────

  streakCheckin: (subType: string, completed: boolean) =>
    track('streak_checkin', { sub_type: subType, completed }),

  streakMilestone: (subType: string, weeks: number) =>
    track('streak_milestone', { sub_type: subType, weeks }),

  // ─── Budget Events (Feature 2) ────────────────────────────────────────────

  budgetViewed: (percentageUsed: number) =>
    track('budget_viewed', { percentage_used: Math.round(percentageUsed) }),

  // ─── Narrative Events (Feature 3) ─────────────────────────────────────────

  narrativeViewed: () =>
    track('narrative_viewed'),

  narrativeGenerated: () =>
    track('narrative_generated'),

  // ─── Explainer Events (Feature 7) ─────────────────────────────────────────

  explainerOpened: (category: string) =>
    track('explainer_opened', { category }),

  // ─── Profile Review Events (Section 1) ───────────────────────────────────

  profileReviewBannerShown: (daysSinceReview: number) =>
    track('profile_review_banner_shown', { days_since_review: daysSinceReview }),

  profileReviewCompleted: (category: string) =>
    track('profile_review_completed', { category }),

  profileReviewDismissed: () =>
    track('profile_review_dismissed'),

}