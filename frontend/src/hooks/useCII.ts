/**
 * useCII Hooks
 *
 * React Query hooks for the Carbon Improvement Index score,
 * history, and breakdown.
 */

import { useQuery } from '@tanstack/react-query'
import apiClient from '../services/api'
import { API_ENDPOINTS, QUERY_KEYS } from '../utils/constants'
import type { CIIScore, CIIBreakdown } from '../types/api.types'

/**
 * Fetches current CII composite score with sub-scores.
 */
export function useCIICurrent() {
  return useQuery({
    queryKey: QUERY_KEYS.CII_CURRENT,
    queryFn: async (): Promise<CIIScore> => {
      const response = await apiClient.get<CIIScore>(API_ENDPOINTS.CII_CURRENT)
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetches CII score history over past N months.
 */
export function useCIIHistory(months: number = 6) {
  return useQuery({
    queryKey: QUERY_KEYS.CII_HISTORY(months),
    queryFn: async (): Promise<CIIScore[]> => {
      const response = await apiClient.get<CIIScore[]>(
        API_ENDPOINTS.CII_HISTORY,
        { params: { months } }
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetches CII breakdown with improvement guidance.
 */
export function useCIIBreakdown() {
  return useQuery({
    queryKey: QUERY_KEYS.CII_BREAKDOWN,
    queryFn: async (): Promise<CIIBreakdown> => {
      const response = await apiClient.get<CIIBreakdown>(API_ENDPOINTS.CII_BREAKDOWN)
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}