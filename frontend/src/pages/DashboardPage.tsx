/**
 * DashboardPage
 *
 * Main dashboard showing:
 * - Carbon summary metric cards with benchmark context (Section 6)
 * - Profile review banner when data is stale (Section 1)
 * - Emission breakdown donut chart with CO₂e labels (Section 5)
 * - CII Score gauge
 * - Quick actions from top recommendations
 *
 * Addresses:
 * - UNDERSTAND: breakdown chart with explanations
 * - TRACK: summary cards with benchmark-aware trend display
 * - REDUCE: quick action recommendations
 * - MEASURE: CII score display
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useCarbonSummary } from '../hooks/useCarbon'
import { useRecommendationsList, useBehaviorFeedback } from '../hooks/useRecommendations'
import { useCIICurrent } from '../hooks/useCII'
import CarbonSummaryCard from '../components/dashboard/CarbonSummaryCard'
import CIIScoreCard from '../components/dashboard/CIIScoreCard'
import EmissionBreakdownChart from '../components/dashboard/EmissionBreakdownChart'
import QuickActionsPanel from '../components/dashboard/QuickActionsPanel'
import { EMISSION_BENCHMARKS } from '../utils/constants'

export default function DashboardPage() {
  const navigate = useNavigate()
  const carbonSummary = useCarbonSummary()
  const recommendations = useRecommendationsList(5)
  const ciiScore = useCIICurrent()
  const behaviorFeedback = useBehaviorFeedback()
  const [reviewDismissed, setReviewDismissed] = useState(false)

  const summary = carbonSummary.data ?? null
  const isLoading = carbonSummary.isLoading

  // Profile review due check from summary response
  // The profile endpoint returns profile_review_due but for now
  // we drive it from a simple client-side check using last_updated
  // from local storage until Phase 5 profile routes are updated.
  const profileReviewDue = false // Will be driven by API in next iteration

  function handleAcceptRecommendation(recommendationId: string): void {
    behaviorFeedback.mutate(
      { recommendation_id: recommendationId, action: 'accepted' },
      {
        onSuccess: (result) => {
          toast.success(result.message || 'Recommendation accepted! 🌱')
        },
        onError: () => {
          toast.error('Failed to accept recommendation. Please try again.')
        },
      },
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-600 mt-1">Your carbon footprint overview</p>
      </div>

      {/* Profile Review Banner (Section 1) */}
      {profileReviewDue && !reviewDismissed && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-4"
          role="alert"
        >
          <div>
            <p className="text-sm font-medium text-amber-800">
              📋 Profile Review Due
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Your lifestyle inputs haven&apos;t been updated in 30 days.
              A quick review ensures your footprint stays accurate.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/onboarding')}
              className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Update Profile
            </button>
            <button
              onClick={() => setReviewDismissed(true)}
              className="text-xs text-amber-500 hover:text-amber-700 px-2 py-1.5"
              aria-label="Dismiss profile review reminder"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Summary Metric Cards (Section 6 — benchmark-aware) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CarbonSummaryCard
          label="Today"
          valueKg={summary?.today_kg ?? null}
          icon="📊"
          isLoading={isLoading}
        />
        <CarbonSummaryCard
          label="This Week"
          valueKg={summary?.this_week_kg ?? null}
          icon="📅"
          isLoading={isLoading}
        />
        <CarbonSummaryCard
          label="This Month"
          valueKg={summary?.this_month_kg ?? null}
          trend={summary?.trend}
          trendPercentage={summary?.trend_percentage}
          trendMessage={summary?.trend_message}
          vsGlobalAverage={summary?.vs_global_average_percentage}
          icon="📆"
          isLoading={isLoading}
        />
        <CIIScoreCard
          score={ciiScore.data?.composite_score ?? null}
          isLoading={ciiScore.isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Emission Breakdown — 2 columns */}
        <div className="xl:col-span-2">
          <EmissionBreakdownChart
            breakdown={summary?.breakdown ?? null}
            breakdownPercentage={summary?.breakdown_percentage ?? null}
            primaryContributor={summary?.primary_contributor ?? null}
            explanation={summary?.primary_contributor_explanation ?? null}
            isLoading={isLoading}
          />
        </div>

        {/* Quick Actions — 1 column */}
        <div>
          <QuickActionsPanel
            recommendations={recommendations.data ?? null}
            isLoading={recommendations.isLoading}
            onAccept={handleAcceptRecommendation}
          />
        </div>
      </div>

      {/* Error State */}
      {carbonSummary.isError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4" role="alert">
          <p className="text-sm text-red-800">
            <span className="font-medium">Unable to load carbon data. </span>
            {carbonSummary.error instanceof Error
              ? carbonSummary.error.message
              : 'Please check your connection and try again.'}
          </p>
          <button
            onClick={() => carbonSummary.refetch()}
            className="mt-2 text-sm text-red-600 font-medium hover:text-red-700"
          >
            Retry →
          </button>
        </div>
      )}

      {/* Benchmark Context Bar (Section 6) */}
      {summary && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-600 font-medium mb-2">
            📍 How does your footprint compare?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
              <span className="text-slate-500">Global Average</span>
              <span className="font-semibold text-slate-700">
                {EMISSION_BENCHMARKS.GLOBAL_AVERAGE_MONTHLY} kg CO₂e
              </span>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
              <span className="text-slate-500">EU Average</span>
              <span className="font-semibold text-slate-700">
                {EMISSION_BENCHMARKS.EU_AVERAGE_MONTHLY} kg CO₂e
              </span>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-primary-200 bg-primary-50">
              <span className="text-primary-700">Paris Target</span>
              <span className="font-semibold text-primary-700">
                {EMISSION_BENCHMARKS.PARIS_TARGET_MONTHLY} kg CO₂e
              </span>
            </div>
          </div>
          {summary.this_month_kg < EMISSION_BENCHMARKS.GLOBAL_AVERAGE_MONTHLY && (
            <p className="text-xs text-green-600 font-medium mt-2">
              ✓ Your emissions are below the global average. Keep going!
            </p>
          )}
        </div>
      )}
    </div>
  )
}