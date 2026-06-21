/**
 * useStreaks Hook — Feature 1
 *
 * React Query hooks for streak data and check-in mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStreaks, submitStreakCheckin } from '../services/streakService'
import { QUERY_KEYS } from '../utils/constants'
import type { StreakCheckinRequest } from '../types/api.types'

/**
 * Fetches all active streak records with summary statistics.
 */
export function useStreaks() {
  return useQuery({
    queryKey: QUERY_KEYS.STREAKS,
    queryFn: getStreaks,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

/**
 * Mutation for submitting a weekly streak check-in.
 * On success, invalidates the streaks query to refresh status.
 */
export function useStreakCheckin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: StreakCheckinRequest) => submitStreakCheckin(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STREAKS })
    },
  })
}