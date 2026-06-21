/**
 * Prediction Service
 *
 * API client methods for fetching emission trajectory
 * projections and reduction path forecasts.
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../utils/constants'
import type { EmissionTrajectory } from '../types/simulation.types'

/**
 * Gets current emission trajectory projection.
 */
export async function getTrajectory(
  months: number = 12
): Promise<EmissionTrajectory> {
  const response = await apiClient.get<EmissionTrajectory>(
    API_ENDPOINTS.PREDICTION_TRAJECTORY,
    { params: { months } }
  )
  return response.data
}

/**
 * Gets projected emissions if top recommendations are adopted.
 */
export async function getTrajectoryWithRecommendations(
  months: number = 12
): Promise<EmissionTrajectory> {
  const response = await apiClient.get<EmissionTrajectory>(
    API_ENDPOINTS.PREDICTION_WITH_RECOMMENDATIONS,
    { params: { months } }
  )
  return response.data
}