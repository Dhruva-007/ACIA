/**
 * Carbon Domain Types
 *
 * Defines all data structures related to carbon emissions,
 * calculations, and tracking.
 *
 * All emission values are in kg CO₂e (CO₂ equivalent) including
 * methane (CH₄) and nitrous oxide (N₂O) converted using
 * IPCC AR6 GWP100 factors. This is the scientifically correct
 * approach for personal carbon footprint accounting.
 *
 * These types mirror the backend Pydantic models exactly
 * to ensure type safety across the full stack.
 */

// ─── Emission Categories ──────────────────────────────────────────────────

export type EmissionCategory = 'transport' | 'energy' | 'food' | 'shopping'

export type TransportMode =
  | 'car_petrol'
  | 'car_diesel'
  | 'car_electric'
  | 'motorcycle'
  | 'public_transport'
  | 'bicycle'
  | 'walking'

export type DietType =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'flexitarian'
  | 'omnivore'
  | 'high_meat'

export type EnergySource = 'grid_average' | 'renewable' | 'gas_heavy'

export type ShoppingFrequency = 'minimal' | 'moderate' | 'frequent'

export type FoodWasteLevel = 'low' | 'medium' | 'high'

// ─── Lifestyle Inputs ─────────────────────────────────────────────────────

export interface TransportInput {
  primary_mode: TransportMode
  daily_distance_km: number
  weekly_flight_hours: number
  car_passengers_avg: number
}

export interface EnergyInput {
  household_size: number
  energy_source: EnergySource
  monthly_kwh: number
  heating_type: string
}

export interface FoodInput {
  diet_type: DietType
  local_food_percentage: number
  food_waste_level: FoodWasteLevel
}

export interface ShoppingInput {
  monthly_spend_category: ShoppingFrequency
  second_hand_percentage: number
  electronics_yearly: number
}

export interface UserLifestyleInput {
  transport: TransportInput
  energy: EnergyInput
  food: FoodInput
  shopping: ShoppingInput
}

// ─── Carbon Breakdown ─────────────────────────────────────────────────────

/** Per-category emission values in kg CO₂e/month */
export interface EmissionBreakdown {
  transport_kg: number
  energy_kg: number
  food_kg: number
  shopping_kg: number
}

/** Per-category emission percentages (0-100) */
export interface EmissionBreakdownPercentage {
  transport: number
  energy: number
  food: number
  shopping: number
}

/** Complete carbon calculation result (all values in kg CO₂e) */
export interface CarbonBreakdown {
  total_kg: number
  daily_kg: number
  breakdown: EmissionBreakdown
  breakdown_percentage: EmissionBreakdownPercentage
  primary_contributor: EmissionCategory
  primary_contributor_explanation: string
  calculated_at: string
}

// ─── Carbon Summary ───────────────────────────────────────────────────────

/**
 * Trend state. 'new_user' means fewer than 7 days of data exist
 * and no meaningful trend comparison is available yet.
 */
export type TrendState = 'increasing' | 'stable' | 'decreasing' | 'new_user'

/** Current carbon footprint summary (all values in kg CO₂e) */
export interface CarbonSummary {
  today_kg: number
  this_week_kg: number
  this_month_kg: number
  this_year_kg: number
  breakdown: EmissionBreakdown
  breakdown_percentage: EmissionBreakdownPercentage
  primary_contributor: EmissionCategory
  primary_contributor_explanation: string
  trend: TrendState
  /** Null when trend is 'new_user' */
  trend_percentage: number | null
  /** Human-readable message for the current trend state */
  trend_message: string
  /** Percentage difference vs global average (positive = above average) */
  vs_global_average_percentage: number
  /** Paris Agreement monthly target in kg CO₂e */
  paris_target_kg: number
  /** Global average monthly emissions in kg CO₂e */
  global_average_kg: number
}

// ─── Emission History ─────────────────────────────────────────────────────

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

/** Single data point for history charts */
export interface EmissionDataPoint {
  date: string
  total_kg: number
  breakdown: EmissionBreakdown
}

/** Emission history for a time period */
export interface EmissionHistory {
  period: TimePeriod
  data_points: EmissionDataPoint[]
  average_kg: number
  total_kg: number
}

// ─── Period Comparison ────────────────────────────────────────────────────

export interface PeriodComparison {
  period_a: {
    label: string
    total_kg: number
    breakdown: EmissionBreakdown
  }
  period_b: {
    label: string
    total_kg: number
    breakdown: EmissionBreakdown
  }
  difference_kg: number
  difference_percentage: number
  improved: boolean
}