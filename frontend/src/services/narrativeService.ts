/**
 * Narrative Service — Feature 3
 *
 * API client for AI-powered weekly carbon narrative endpoints.
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../utils/constants'
import type { WeeklyNarrative } from '../types/api.types'

/**
 * Retrieves the current week's AI-generated narrative.
 * Returns null if no narrative has been generated yet this week.
 */
export async function getWeeklyNarrative(): Promise<WeeklyNarrative | null> {
  const response = await apiClient.get<WeeklyNarrative | null>(
    API_ENDPOINTS.NARRATIVE_WEEKLY
  )
  return response.data
}

/**
 * Triggers generation of a new weekly narrative via Vertex AI.
 * Falls back to a template-based narrative if AI is unavailable.
 */
export async function generateWeeklyNarrative(): Promise<WeeklyNarrative> {
  const response = await apiClient.post<WeeklyNarrative>(
    API_ENDPOINTS.NARRATIVE_GENERATE,
    {}
  )
  return response.data
}