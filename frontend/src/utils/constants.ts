/**
 * Application Constants
 *
 * Single source of truth for all constant values used across
 * the ACIA frontend. Never use magic numbers or hardcoded
 * strings in components — import from here instead.
 *
 * All carbon values are in kg CO₂e (CO₂ equivalent) including
 * methane and nitrous oxide per IPCC AR6 GWP100 factors.
 */

import type { EmissionCategory, TransportMode, DietType } from '../types/carbon.types'

// ─── Emission Category Display ────────────────────────────────────────────

export const CATEGORY_LABELS: Record<EmissionCategory, string> = {
  transport: 'Transportation',
  energy: 'Energy',
  food: 'Food & Diet',
  shopping: 'Shopping',
}

export const CATEGORY_COLORS: Record<EmissionCategory, string> = {
  transport: '#3b82f6',
  energy: '#f59e0b',
  food: '#22c55e',
  shopping: '#a855f7',
}

export const CATEGORY_ICONS: Record<EmissionCategory, string> = {
  transport: '🚗',
  energy: '⚡',
  food: '🍽️',
  shopping: '🛍️',
}

export const CATEGORY_DESCRIPTIONS: Record<EmissionCategory, string> = {
  transport:
    'Emissions from personal travel including daily commute, flights, and other vehicle use.',
  energy:
    'Emissions from household electricity and heating consumption.',
  food:
    'Emissions from food production, processing, and transportation based on your dietary choices.',
  shopping:
    'Emissions from manufacturing and shipping of goods you purchase.',
}

// ─── Transport Mode Labels ────────────────────────────────────────────────

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  car_petrol: 'Petrol Car',
  car_diesel: 'Diesel Car',
  car_electric: 'Electric Car',
  motorcycle: 'Motorcycle',
  public_transport: 'Public Transport',
  bicycle: 'Bicycle',
  walking: 'Walking',
}

// ─── Diet Type Labels ─────────────────────────────────────────────────────

export const DIET_TYPE_LABELS: Record<DietType, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  pescatarian: 'Pescatarian',
  flexitarian: 'Flexitarian',
  omnivore: 'Omnivore',
  high_meat: 'High Meat Consumer',
}

// ─── Score Thresholds ─────────────────────────────────────────────────────

export const SCORE_THRESHOLDS = {
  HIGH: 70,
  MEDIUM: 40,
  LOW: 0,
} as const

export const CII_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0,
} as const

// ─── CII Score Labels ─────────────────────────────────────────────────────

export const CII_LEVEL_LABELS = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Needs Improvement',
} as const

// ─── Recommendation Labels ────────────────────────────────────────────────

export const COST_LEVEL_LABELS = {
  free: 'Free',
  low: 'Low Cost',
  medium: 'Moderate Cost',
  high: 'High Cost',
  investment: 'Major Investment',
} as const

export const DISRUPTION_LEVEL_LABELS = {
  minimal: 'Minimal Effort',
  low: 'Low Effort',
  medium: 'Moderate Effort',
  high: 'High Effort',
} as const

// ─── Time Periods ─────────────────────────────────────────────────────────

export const TIME_PERIOD_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
} as const

// ─── Simulation Scenario Labels ───────────────────────────────────────────

export const SIMULATION_SCENARIO_LABELS = {
  replace_car_trips: 'Replace Car Trips with Public Transport',
  reduce_meat: 'Reduce Meat Consumption',
  remote_work: 'Work Remotely',
  switch_energy_source: 'Switch to Renewable Energy',
} as const

// ─── Emission Benchmarks (kg CO₂e per month) ─────────────────────────────
// Source: IPCC AR6, IEA, Global Carbon Project 2023

export const EMISSION_BENCHMARKS = {
  /** Average global per-capita monthly emissions */
  GLOBAL_AVERAGE_MONTHLY: 375,
  /** UK average per-capita monthly emissions */
  UK_AVERAGE_MONTHLY: 333,
  /** EU average per-capita monthly emissions */
  EU_AVERAGE_MONTHLY: 292,
  /** Paris Agreement 1.5°C compatible monthly per-capita target */
  PARIS_TARGET_MONTHLY: 167,
} as const

// ─── Profile Review Cadence ───────────────────────────────────────────────

/** Days between adaptive profile review prompts */
export const PROFILE_REVIEW_INTERVAL_DAYS = 30

// ─── API Configuration ────────────────────────────────────────────────────

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const API_ENDPOINTS = {
  HEALTH: '/health',

  // Profile
  PROFILE_SETUP: '/api/v1/profile/setup',
  PROFILE_GET: '/api/v1/profile',
  PROFILE_UPDATE: '/api/v1/profile',
  PROFILE_QUICK_UPDATE: '/api/v1/profile/quick-update',

  // Carbon
  CARBON_CALCULATE: '/api/v1/carbon/calculate',
  CARBON_HISTORY: '/api/v1/carbon/history',
  CARBON_SUMMARY: '/api/v1/carbon/summary',
  CARBON_COMPARISON: '/api/v1/carbon/comparison',

  // Recommendations
  RECOMMENDATIONS: '/api/v1/recommendations',

  // Behavioral
  BEHAVIOR_FEEDBACK: '/api/v1/behavior/feedback',
  BEHAVIOR_HISTORY: '/api/v1/behavior/history',
  BEHAVIOR_WEIGHTS: '/api/v1/behavior/weights',

  // Simulator
  SIMULATOR_RUN: '/api/v1/simulator/run',
  SIMULATOR_COMPARE: '/api/v1/simulator/compare',
  SIMULATOR_PLAN: '/api/v1/simulator/plan',

  // Prediction
  PREDICTION_TRAJECTORY: '/api/v1/prediction/trajectory',
  PREDICTION_WITH_RECOMMENDATIONS: '/api/v1/prediction/with-recommendations',

  // AI Assistant
  ASSISTANT_CHAT: '/api/v1/assistant/chat',
  ASSISTANT_HISTORY: '/api/v1/assistant/history',

  // CII
  CII_CURRENT: '/api/v1/cii/current',
  CII_HISTORY: '/api/v1/cii/history',
  CII_BREAKDOWN: '/api/v1/cii/breakdown',

  // Streaks (Feature 1)
  STREAKS: '/api/v1/streaks',
  STREAK_CHECKIN: '/api/v1/streaks/checkin',

  // Budget (Feature 2)
  BUDGET_CURRENT: '/api/v1/budget/current',

  // Narrative (Feature 3)
  NARRATIVE_WEEKLY: '/api/v1/narrative/weekly',
  NARRATIVE_GENERATE: '/api/v1/narrative/generate',

  // Explainer (Feature 7)
  EXPLAINER_CATEGORY: '/api/v1/explainer/category',
} as const

// ─── React Query Keys ─────────────────────────────────────────────────────

export const QUERY_KEYS = {
  PROFILE: ['profile'] as const,
  CARBON_SUMMARY: ['carbon', 'summary'] as const,
  CARBON_HISTORY: (period: string) => ['carbon', 'history', period] as const,
  CARBON_COMPARISON: (params: string) => ['carbon', 'comparison', params] as const,
  RECOMMENDATIONS: ['recommendations'] as const,
  BEHAVIOR_WEIGHTS: ['behavior', 'weights'] as const,
  BEHAVIOR_HISTORY: ['behavior', 'history'] as const,
  SIMULATION: (type: string) => ['simulation', type] as const,
  SCENARIO_PLAN: ['simulation', 'plan'] as const,
  PREDICTION: (months: number) => ['prediction', months] as const,
  CII_CURRENT: ['cii', 'current'] as const,
  CII_HISTORY: (months: number) => ['cii', 'history', months] as const,
  CII_BREAKDOWN: ['cii', 'breakdown'] as const,
  ASSISTANT_HISTORY: ['assistant', 'history'] as const,
  STREAKS: ['streaks'] as const,
  BUDGET: ['budget', 'current'] as const,
  NARRATIVE_WEEKLY: ['narrative', 'weekly'] as const,
  EXPLAINER: (category: string) => ['explainer', category] as const,
} as const