/**
 * usePrediction Hooks
 *
 * React Query hooks for the Future Carbon Prediction Engine.
 * Trajectory data is cached for 10 minutes to prevent
 * recalculation on every route change.
 */

import { useQuery } from '@tanstack/react-query'
import { getTrajectory, getTrajectoryWithRecommendations } from '../services/predictionService'
import { QUERY_KEYS } from '../utils/constants'

/**
 * Fetches current emission trajectory projection.
 *
 * staleTime: 10 minutes — trajectory does not change frequently
 * and is expensive to compute. Cached across route changes.
 */
export function useTrajectory(months: number = 12) {
  return useQuery({
    queryKey: QUERY_KEYS.PREDICTION(months),
    queryFn: () => getTrajectory(months),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
  })
}

/**
 * Fetches projected emissions with top recommendations adopted.
 *
 * staleTime: 10 minutes — reduction path changes only when
 * recommendations are accepted or completed, which triggers
 * manual invalidation via the behavior feedback mutation.
 */
export function useTrajectoryWithRecommendations(months: number = 12) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PREDICTION(months), 'with-recommendations'],
    queryFn: () => getTrajectoryWithRecommendations(months),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
  })
}