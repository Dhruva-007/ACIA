/**
 * useRecommendations Hooks
 *
 * React Query hooks for fetching personalized recommendations
 * and submitting behavioral feedback. The recommendation query
 * uses a shorter staleTime because recommendations may change
 * after behavioral feedback is submitted.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRecommendations, submitBehaviorFeedback, getBehavioralWeights } from '../services/recommendationService'
import { QUERY_KEYS } from '../utils/constants'
import type { BehaviorFeedbackRequest } from '../types/recommendation.types'

/**
 * Fetches ranked personalized recommendations.
 */
export function useRecommendationsList(limit: number = 5) {
  return useQuery({
    queryKey: QUERY_KEYS.RECOMMENDATIONS,
    queryFn: () => getRecommendations(limit),
    staleTime: 30 * 1000,
    retry: 2,
  })
}

/**
 * Fetches current behavioral weights for transparency display.
 */
export function useBehavioralWeights() {
  return useQuery({
    queryKey: QUERY_KEYS.BEHAVIOR_WEIGHTS,
    queryFn: getBehavioralWeights,
    staleTime: 60 * 1000,
  })
}

/**
 * Mutation for submitting behavioral feedback.
 * On success, invalidates both recommendations and behavioral
 * weights queries so the UI reflects the updated state.
 */
export function useBehaviorFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (feedback: BehaviorFeedbackRequest) =>
      submitBehaviorFeedback(feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECOMMENDATIONS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BEHAVIOR_WEIGHTS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CII_CURRENT })
      // Invalidate prediction cache when behavior changes
      // so reduction path reflects new accepted/rejected recommendations
      queryClient.invalidateQueries({ queryKey: ['prediction'] })
    },
  })
}