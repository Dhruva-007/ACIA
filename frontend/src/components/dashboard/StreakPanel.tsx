/**
 * StreakPanel Component — Feature 1: Behavioral Streak Tracking
 *
 * Displays active behavioral streaks on the dashboard.
 * Each streak shows:
 * - The recommendation action type
 * - Current streak count (weeks)
 * - Status badge (active/at_risk/broken)
 * - Weekly check-in button when due
 *
 * Behavioral science basis: James Clear's Atomic Habits research
 * shows that visual streak displays are among the most powerful
 * habit reinforcement mechanisms available.
 */
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import { useStreaks, useStreakCheckin } from '../../hooks/useStreaks'

export default function StreakPanel() {
  const streaks = useStreaks()
  const checkin = useStreakCheckin()

  if (streaks.isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">🔥 Streaks</p>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const data = streaks.data
  const activeStreaks = data?.streaks ?? []

  if (activeStreaks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-3">🔥 Streaks</p>
        <div className="text-center py-4">
          <p className="text-sm text-slate-400">
            Accept recommendations to start building streaks.
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Streaks track your weekly progress on accepted actions.
          </p>
        </div>
      </div>
    )
  }

  function handleCheckin(subType: string, completed: boolean): void {
    checkin.mutate(
      { sub_type: subType, completed },
      {
        onSuccess: (result) => {
          toast.success(result.message)
        },
        onError: () => {
          toast.error('Check-in failed. Please try again.')
        },
      }
    )
  }

  function getStatusBadge(status: string, streak: number): ReactNode {
    if (status === 'broken') {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
          Broken
        </span>
      )
    }
    if (status === 'at_risk') {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          Due soon!
        </span>
      )
    }
    if (streak >= 4) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          🔥 On fire
        </span>
      )
    }
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
        Active
      </span>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">🔥 Streaks</p>
        {data && data.total_active > 0 && (
          <span className="text-xs text-slate-400">
            {data.total_active} active
          </span>
        )}
      </div>

      <div className="space-y-3">
        {activeStreaks.map((streak) => {
          const isCheckinDue = streak.status === 'at_risk' || streak.status === 'broken'
          const label = streak.sub_type.replace(/_/g, ' ')

          return (
            <div
              key={streak.sub_type}
              className={`p-3 rounded-xl border transition-colors ${
                streak.status === 'at_risk'
                  ? 'border-amber-200 bg-amber-50'
                  : streak.status === 'broken'
                  ? 'border-red-200 bg-red-50'
                  : 'border-slate-100 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-700 capitalize">
                    {label}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {streak.current_streak} week{streak.current_streak !== 1 ? 's' : ''}
                    </span>
                    {getStatusBadge(streak.status, streak.current_streak)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {streak.current_streak}
                  </p>
                  <p className="text-xs text-slate-400">weeks</p>
                </div>
              </div>

              {/* Weekly check-in buttons */}
              {isCheckinDue && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleCheckin(streak.sub_type, true)}
                    disabled={checkin.isPending}
                    className="flex-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    ✓ Did it!
                  </button>
                  <button
                    onClick={() => handleCheckin(streak.sub_type, false)}
                    disabled={checkin.isPending}
                    className="flex-1 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    ✗ Not this week
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Longest streak summary */}
      {data && data.longest_current > 0 && (
        <p className="text-xs text-slate-400 text-center mt-3">
          Longest current streak: {data.longest_current} week{data.longest_current !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}