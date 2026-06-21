/**
 * Explainer Service — Feature 7
 *
 * API client for the Carbon Footprint Explainer Mode.
 * Requests AI-generated explanations for specific emission categories.
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../utils/constants'
import type { ExplainerResponse } from '../types/api.types'
import type { EmissionCategory } from '../types/carbon.types'

/**
 * Requests an AI-generated explanation for a specific emission category.
 *
 * Shows the user exactly how their category emissions were calculated,
 * including the emission factors used and their sources.
 *
 * @param category - The emission category to explain
 */
export async function getCategoryExplanation(
  category: EmissionCategory
): Promise<ExplainerResponse> {
  const response = await apiClient.post<ExplainerResponse>(
    API_ENDPOINTS.EXPLAINER_CATEGORY,
    { category }
  )
  return response.data
}