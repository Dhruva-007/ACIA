/**
 * Streak Service — Feature 1
 *
 * API client for behavioral streak tracking endpoints.
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../utils/constants'
import type { StreakSummary, StreakRecord, StreakCheckinRequest } from '../types/api.types'

/**
 * Retrieves all streak records with summary statistics.
 */
export async function getStreaks(): Promise<StreakSummary> {
  const response = await apiClient.get<StreakSummary>(API_ENDPOINTS.STREAKS)
  return response.data
}

/**
 * Submits a weekly streak check-in.
 *
 * @param request - sub_type and completed flag
 */
export async function submitStreakCheckin(
  request: StreakCheckinRequest
): Promise<StreakRecord & { message: string }> {
  const response = await apiClient.post<StreakRecord & { message: string }>(
    API_ENDPOINTS.STREAK_CHECKIN,
    request
  )
  return response.data
}

export type { StreakRecord }