/**
 * RecommendationList Component
 *
 * Renders the ranked list of personalized recommendations.
 * Supports filtering by status (all, pending, accepted, completed).
 *
 * Empty states are descriptive to guide user action.
 */

import { useState } from 'react'
import RecommendationCard from './RecommendationCard'
import type { Recommendation, BehavioralAction, RecommendationStatus } from '../../types/recommendation.types'

interface RecommendationListProps {
  recommendations: Recommendation[]
  isLoading: boolean
  onAction: (recommendationId: string, action: BehavioralAction) => void
  isSubmitting: boolean
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'completed'

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
]

function matchesFilter(status: RecommendationStatus, filter: FilterStatus): boolean {
  if (filter === 'all') return true
  return status === filter
}

export default function RecommendationList({
  recommendations,
  isLoading,
  onAction,
  isSubmitting,
}: RecommendationListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all')

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
          >
            <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
            <div className="h-3 bg-slate-100 rounded w-full mb-2" />
            <div className="h-3 bg-slate-100 rounded w-2/3 mb-4" />
            <div className="h-8 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  const filtered = recommendations.filter((rec) => matchesFilter(rec.status, filter))

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
        {FILTER_OPTIONS.map((option) => {
          const count = option.value === 'all'
            ? recommendations.length
            : recommendations.filter((r) => r.status === option.value).length

          return (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                filter === option.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {option.label}
              {count > 0 && (
                <span className="ml-1 text-slate-400">({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Recommendation Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500 text-sm">
            {filter === 'all'
              ? 'No recommendations available. Complete onboarding to receive personalized actions.'
              : `No ${filter} recommendations.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onAction={onAction}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}