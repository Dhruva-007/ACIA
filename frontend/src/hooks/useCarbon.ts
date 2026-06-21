/**
 * useCarbon Hooks
 *
 * React Query hooks for carbon summary, history, and budget data.
 * Each hook manages caching, background refetching, and error states.
 *
 * All returned values are in kg CO₂e.
 */

import { useQuery } from '@tanstack/react-query'
import {
  getCarbonSummary,
  getCarbonHistory,
  getCarbonBudget,
} from '../services/carbonService'
import { QUERY_KEYS } from '../utils/constants'
import type { TimePeriod } from '../types/carbon.types'

/**
 * Fetches current carbon footprint summary with category breakdown,
 * benchmark comparisons, and trend data.
 *
 * Used by the Dashboard page.
 * staleTime: 5 minutes — carbon calculations do not change frequently.
 */
export function useCarbonSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.CARBON_SUMMARY,
    queryFn: getCarbonSummary,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

/**
 * Fetches emission history for a specific time period.
 *
 * Used by the Tracking page for timeline charts.
 *
 * @param period  - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param enabled - Set false to defer fetching until ready
 */
export function useCarbonHistory(period: TimePeriod, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.CARBON_HISTORY(period),
    queryFn: () => getCarbonHistory(period),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled,
  })
}

/**
 * Fetches current month carbon budget progress.
 *
 * Used by the Dashboard CarbonBudgetCard (Feature 2).
 * staleTime: 10 minutes — budget changes only as emissions accumulate.
 */
export function useCarbonBudget() {
  return useQuery({
    queryKey: QUERY_KEYS.BUDGET,
    queryFn: getCarbonBudget,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })
}