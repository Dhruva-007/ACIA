/**
 * Simulation and Prediction Domain Types
 *
 * Defines all data structures for the Carbon Impact Simulator,
 * Future Carbon Prediction Engine, and Scenario Planner.
 *
 * All emission values are in kg CO₂e (CO₂ equivalent).
 */

// ─── Simulation ───────────────────────────────────────────────────────────

export type SimulationScenarioType =
  | 'replace_car_trips'
  | 'reduce_meat'
  | 'remote_work'
  | 'switch_energy_source'

export interface ReplaceCarTripsParams {
  trips_per_week: number
  one_way_distance_km: number
  current_vehicle: string
}

export interface ReduceMeatParams {
  meals_changed_per_week: number
  from_type: 'beef' | 'chicken' | 'pork'
  to_type: 'vegetarian' | 'vegan' | 'fish'
}

export interface RemoteWorkParams {
  remote_days_per_week: number
  commute_distance_km: number
  vehicle_type: string
}

export interface SwitchEnergyParams {
  current_source: 'grid_average' | 'gas_heavy'
  target_source: 'renewable'
  monthly_kwh: number
}

export type SimulationParams =
  | ReplaceCarTripsParams
  | ReduceMeatParams
  | RemoteWorkParams
  | SwitchEnergyParams

export interface SimulationInput {
  scenario_type: SimulationScenarioType
  parameters: SimulationParams
}

/** Result of a single simulation (all kg values in kg CO₂e) */
export interface SimulationResult {
  scenario_type: SimulationScenarioType
  scenario_label: string
  monthly_saving_kg: number
  annual_saving_kg: number
  percentage_improvement: number
  current_monthly_kg: number
  projected_monthly_kg: number
  description: string
}

export interface SimulationComparison {
  scenarios: SimulationResult[]
  best_scenario: SimulationResult | null
}

// ─── Scenario Planner (Feature 4) ────────────────────────────────────────

export interface MilestoneProjection {
  milestone_label: string
  target_kg_monthly: number
  estimated_months: number | null
  estimated_date: string | null
  achievable: boolean
}

/** Request for multi-action scenario plan */
export interface ScenarioPlanRequest {
  scenarios: SimulationInput[]
}

/** Result of a multi-action scenario plan (all kg values in kg CO₂e) */
export interface ScenarioPlanResult {
  scenarios: SimulationResult[]
  combined_monthly_saving_kg: number
  combined_annual_saving_kg: number
  combined_percentage_improvement: number
  current_monthly_kg: number
  projected_monthly_kg: number
  milestones: MilestoneProjection[]
  summary: string
}

// ─── Prediction ───────────────────────────────────────────────────────────

/** Single data point in an emission trajectory (kg CO₂e) */
export interface PredictionDataPoint {
  month: string
  projected_kg: number
  label: string
}

/**
 * Complete emission trajectory projection.
 * All kg values in kg CO₂e.
 * 'new_user' trend is not applicable here as prediction
 * requires lifestyle data to exist.
 */
export interface EmissionTrajectory {
  horizon_months: number
  current_monthly_kg: number
  trend: 'increasing' | 'stable' | 'decreasing'
  trend_slope: number
  trajectory: PredictionDataPoint[]
  reduction_path: PredictionDataPoint[]
  potential_total_saving_kg: number
  potential_saving_percentage: number
}