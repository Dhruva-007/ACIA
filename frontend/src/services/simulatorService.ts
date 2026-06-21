/**
 * Simulator Service
 *
 * API client methods for the Carbon Impact Simulator and
 * multi-action Scenario Planner.
 *
 * All values returned are in kg CO₂e.
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../utils/constants'
import type {
  SimulationInput,
  SimulationResult,
  SimulationComparison,
  ScenarioPlanRequest,
  ScenarioPlanResult,
} from '../types/simulation.types'

/**
 * Runs a single lifestyle change simulation.
 *
 * Uses the user's current emissions as baseline.
 * Returns monthly/annual savings and percentage improvement.
 */
export async function runSimulation(
  input: SimulationInput
): Promise<SimulationResult> {
  const response = await apiClient.post<SimulationResult>(
    API_ENDPOINTS.SIMULATOR_RUN,
    input
  )
  return response.data
}

/**
 * Compares multiple simulation scenarios side by side.
 *
 * Results are sorted by monthly saving descending.
 * The best scenario is highlighted separately.
 */
export async function compareSimulations(
  scenarios: SimulationInput[]
): Promise<SimulationComparison> {
  const response = await apiClient.post<SimulationComparison>(
    API_ENDPOINTS.SIMULATOR_COMPARE,
    { scenarios }
  )
  return response.data
}

/**
 * Creates a multi-action scenario plan (Feature 4).
 *
 * Accepts multiple lifestyle changes and calculates:
 * - Combined monthly and annual CO₂e savings
 * - Milestone achievement dates
 * - Plain-language summary
 *
 * Combined saving is capped at 80% of current emissions.
 */
export async function createScenarioPlan(
  request: ScenarioPlanRequest
): Promise<ScenarioPlanResult> {
  const response = await apiClient.post<ScenarioPlanResult>(
    API_ENDPOINTS.SIMULATOR_PLAN,
    request
  )
  return response.data
}