/**
 * WeeklyNarrativeCard Component — Feature 3: AI Weekly Carbon Narrative
 *
 * Displays the AI-generated weekly carbon story on the dashboard.
 * Transforms raw emission numbers into a meaningful narrative
 * that users remember and act on.
 *
 * Shows a "Generate" button when no narrative exists for the week.
 * Shows a "Regenerate" button to refresh the narrative.
 *
 * Powered by Vertex AI Gemini via the narrative service.
 */

import toast from 'react-hot-toast'
import { useWeeklyNarrative, useGenerateNarrative } from '../../hooks/useNarrative'
import { formatRelativeTime } from '../../utils/formatters'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function WeeklyNarrativeCard() {
  const narrative = useWeeklyNarrative()
  const generateMutation = useGenerateNarrative()

  function handleGenerate(): void {
    generateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Weekly narrative generated! 🤖')
      },
      onError: () => {
        toast.error('Failed to generate narrative. Please try again.')
      },
    })
  }

  if (narrative.isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <div className="h-3 bg-slate-100 rounded w-1/3 mb-3" />
        <div className="h-3 bg-slate-100 rounded w-full mb-2" />
        <div className="h-3 bg-slate-100 rounded w-4/5" />
      </div>
    )
  }

  const data = narrative.data

  // No narrative yet for this week
  if (!data) {
    return (
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden="true">🤖</span>
          <p className="text-sm font-medium text-primary-800">
            Weekly Carbon Narrative
          </p>
        </div>
        <p className="text-sm text-primary-700 mb-4">
          Get your personalized AI-written carbon summary for this week.
          See what drove your emissions and what to focus on next.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="btn-primary text-sm py-2"
        >
          {generateMutation.isPending ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size={16} />
              Generating...
            </span>
          ) : (
            'Generate This Week\'s Narrative ✨'
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">🤖</span>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Weekly Carbon Narrative
            </p>
            <p className="text-xs text-slate-400">
              Generated {formatRelativeTime(data.generated_at)} · Powered by Vertex AI Gemini
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="text-xs text-slate-400 hover:text-primary-600 transition-colors"
          aria-label="Regenerate weekly narrative"
        >
          {generateMutation.isPending ? '...' : '↺ Refresh'}
        </button>
      </div>

      {/* Narrative text */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          {data.narrative_text}
        </p>
      </div>

      {/* Context stats */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <span>Week total: {data.weekly_total_kg.toFixed(1)} kg CO₂e</span>
        {data.vs_previous_week_percentage !== null && (
          <span className={
            (data.vs_previous_week_percentage ?? 0) < 0 ? 'text-green-600' : 'text-amber-600'
          }>
            {(data.vs_previous_week_percentage ?? 0) > 0 ? '+' : ''}
            {data.vs_previous_week_percentage?.toFixed(1)}% vs last week
          </span>
        )}
      </div>
    </div>
  )
}