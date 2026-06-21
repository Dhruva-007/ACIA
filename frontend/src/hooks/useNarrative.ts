/**
 * useNarrative Hook — Feature 3
 *
 * React Query hooks for the weekly AI carbon narrative.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWeeklyNarrative, generateWeeklyNarrative } from '../services/narrativeService'
import { QUERY_KEYS } from '../utils/constants'

/**
 * Fetches the current week's AI-generated narrative.
 * Returns null in data when no narrative exists yet.
 */
export function useWeeklyNarrative() {
  return useQuery({
    queryKey: QUERY_KEYS.NARRATIVE_WEEKLY,
    queryFn: getWeeklyNarrative,
    staleTime: 60 * 60 * 1000, // 1 hour — narrative doesn't change often
    retry: 1,
  })
}

/**
 * Mutation for triggering narrative generation via Vertex AI.
 * On success, invalidates the narrative query to show the new narrative.
 */
export function useGenerateNarrative() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateWeeklyNarrative,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NARRATIVE_WEEKLY })
    },
  })
}