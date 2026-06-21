/**
 * Recommendation Domain Types
 *
 * Defines all data structures for the Adaptive Recommendation
 * Engine and Behavioral Learning Engine. The five-dimension
 * scoring system is fully typed here.
 */

import type { EmissionCategory } from './carbon.types'

// ─── Recommendation Status ────────────────────────────────────────────────

export type RecommendationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'failed'
  | 'deferred'

export type BehavioralAction =
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'failed'
  | 'deferred'

// ─── Scoring ──────────────────────────────────────────────────────────────

export interface RecommendationScores {
  carbon_impact: number
  adoption_probability: number
  cost_score: number
  convenience_score: number
  lifestyle_score: number
}

// ─── Recommendation ───────────────────────────────────────────────────────

export interface Recommendation {
  id: string
  title: string
  description: string
  category: EmissionCategory
  sub_type: string
  scores: RecommendationScores
  composite_score: number
  reasoning: string
  monthly_kg_reduction: number
  annual_kg_reduction: number
  impact_percentage: number
  cost_level: 'free' | 'low' | 'medium' | 'high' | 'investment'
  disruption_level: 'minimal' | 'low' | 'medium' | 'high'
  status: RecommendationStatus
  created_at: string
  updated_at: string
}

export interface RecommendationDetail extends Recommendation {
  action_steps: string[]
  related_recommendations: string[]
}

// ─── Behavioral Feedback ──────────────────────────────────────────────────

export interface BehaviorFeedbackRequest {
  recommendation_id: string
  action: BehavioralAction
}

export interface BehaviorFeedbackResult {
  recommendation_id: string
  action: BehavioralAction
  weight_updated: boolean
  new_category_weight: number
  message: string
}

// ─── Behavioral Weights ───────────────────────────────────────────────────

export interface BehavioralWeights {
  transport: number
  energy: number
  food: number
  shopping: number
  sub_weights: Record<string, number>
  updated_at: string
}

// ─── Behavioral History Event ─────────────────────────────────────────────

export interface BehavioralEvent {
  id: string
  recommendation_id: string
  recommendation_category: EmissionCategory
  recommendation_sub_type: string
  action: BehavioralAction
  previous_weight: number
  new_weight: number
  timestamp: string
}