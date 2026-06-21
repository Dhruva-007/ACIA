/**
 * Carbon Service
 *
 * API client methods for carbon calculation, tracking,
 * and history endpoints.
 *
 * All returned values are in kg CO₂e (CO₂ equivalent).
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../utils/constants'
import type {
  UserLifestyleInput,
  CarbonBreakdown,
  CarbonSummary,
  EmissionHistory,
  TimePeriod,
} from '../types/carbon.types'
import type { CarbonBudget } from '../types/api.types'

/**
 * Submits lifestyle inputs and receives a carbon breakdown.
 * Does not persist the result — use profile/setup for onboarding.
 */
export async function calculateCarbon(
  input: UserLifestyleInput
): Promise<CarbonBreakdown> {
  const response = await apiClient.post<CarbonBreakdown>(
    API_ENDPOINTS.CARBON_CALCULATE,
    input
  )
  return response.data
}

/**
 * Retrieves current carbon footprint summary including:
 * - Daily, weekly, monthly, yearly totals
 * - Category breakdown and percentages
 * - Trend direction and percentage
 * - Benchmark comparisons vs global average and Paris target
 *
 * Returns 'new_user' trend when fewer than 7 days of data exist.
 */
export async function getCarbonSummary(): Promise<CarbonSummary> {
  const response = await apiClient.get<CarbonSummary>(
    API_ENDPOINTS.CARBON_SUMMARY
  )
  return response.data
}

/**
 * Retrieves emission history for a given time period.
 *
 * @param period    - Granularity of the history
 * @param startDate - Optional ISO date string for range start
 * @param endDate   - Optional ISO date string for range end
 */
export async function getCarbonHistory(
  period: TimePeriod,
  startDate?: string,
  endDate?: string
): Promise<EmissionHistory> {
  const params: Record<string, string> = { period }
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate

  const response = await apiClient.get<EmissionHistory>(
    API_ENDPOINTS.CARBON_HISTORY,
    { params }
  )
  return response.data
}

/**
 * Retrieves current month carbon budget progress.
 * Budget is set based on the user's current footprint
 * with a 10% monthly reduction target.
 */
export async function getCarbonBudget(): Promise<CarbonBudget> {
  const response = await apiClient.get<CarbonBudget>(
    API_ENDPOINTS.BUDGET_CURRENT
  )
  return response.data
}