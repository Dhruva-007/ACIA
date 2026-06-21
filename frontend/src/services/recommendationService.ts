/**
 * Recommendation Service
 *
 * API client methods for fetching personalized recommendations,
 * submitting behavioral feedback, and retrieving behavioral
 * history and weights.
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../utils/constants'
import type { Recommendation, BehaviorFeedbackRequest, BehaviorFeedbackResult, BehavioralWeights, BehavioralEvent } from '../types/recommendation.types'

/**
 * Fetches ranked personalized recommendations for the current user.
 */
export async function getRecommendations(
  limit: number = 5
): Promise<Recommendation[]> {
  const response = await apiClient.get<Recommendation[]>(
    API_ENDPOINTS.RECOMMENDATIONS,
    { params: { limit } }
  )
  return response.data
}

/**
 * Submits user feedback on a recommendation (accept, reject, complete, fail, defer).
 */
export async function submitBehaviorFeedback(
  feedback: BehaviorFeedbackRequest
): Promise<BehaviorFeedbackResult> {
  const response = await apiClient.post<BehaviorFeedbackResult>(
    API_ENDPOINTS.BEHAVIOR_FEEDBACK,
    feedback
  )
  return response.data
}

/**
 * Retrieves current behavioral weights for the user.
 */
export async function getBehavioralWeights(): Promise<BehavioralWeights> {
  const response = await apiClient.get<BehavioralWeights>(
    API_ENDPOINTS.BEHAVIOR_WEIGHTS
  )
  return response.data
}

/**
 * Retrieves behavioral interaction history.
 */
export async function getBehavioralHistory(
  limit: number = 20
): Promise<BehavioralEvent[]> {
  const response = await apiClient.get<BehavioralEvent[]>(
    API_ENDPOINTS.BEHAVIOR_HISTORY,
    { params: { limit } }
  )
  return response.data
}