/**
 * useSimulator Hook
 *
 * React Query mutation for running carbon impact simulations.
 * Simulations are user-initiated and not cached because
 * parameters change with every run.
 */

import { useMutation } from '@tanstack/react-query'
import { runSimulation, compareSimulations } from '../services/simulatorService'
import type { SimulationInput } from '../types/simulation.types'

/**
 * Mutation for running a single simulation scenario.
 */
export function useRunSimulation() {
  return useMutation({
    mutationFn: (input: SimulationInput) => runSimulation(input),
  })
}

/**
 * Mutation for comparing multiple simulation scenarios.
 */
export function useCompareSimulations() {
  return useMutation({
    mutationFn: (scenarios: SimulationInput[]) => compareSimulations(scenarios),
  })
}