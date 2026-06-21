/**
 * API Response Types
 *
 * Defines the standard response envelope used by all ACIA
 * backend endpoints, plus domain types for features that
 * do not have dedicated type files.
 */

// ─── Response Envelopes ───────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message: string
  timestamp: string
}

export interface ApiErrorDetail {
  code: string
  message: string
  field?: string
}

export interface ApiErrorResponse {
  success: false
  error: ApiErrorDetail
  timestamp: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ─── CII Types ────────────────────────────────────────────────────────────

export interface CIISubScores {
  awareness_score: number
  action_score: number
  consistency_score: number
  improvement_score: number
}

export interface CIIScore {
  month: string
  composite_score: number
  sub_scores: CIISubScores
  calculated_at: string
}

export interface CIIBreakdown extends CIIScore {
  awareness_guidance: string
  action_guidance: string
  consistency_guidance: string
  improvement_guidance: string
}

// ─── Assistant Types ──────────────────────────────────────────────────────

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AssistantChatRequest {
  message: string
  session_id?: string
}

export interface AssistantResponse {
  response: string
  session_id: string
  context_used: string[]
}

export interface ConversationSession {
  session_id: string
  messages: AssistantMessage[]
  created_at: string
  updated_at: string
}

// ─── Streak Types (Feature 1) ─────────────────────────────────────────────

export interface StreakRecord {
  sub_type: string
  recommendation_id: string
  current_streak: number
  longest_streak: number
  last_checkin_at: string | null
  checkin_due_by: string | null
  status: 'active' | 'at_risk' | 'broken'
  started_at: string
}

export interface StreakSummary {
  streaks: StreakRecord[]
  total_active: number
  longest_current: number
}

export interface StreakCheckinRequest {
  sub_type: string
  completed: boolean
}

// ─── Budget Types (Feature 2) ─────────────────────────────────────────────

/** All kg values in kg CO₂e */
export interface CarbonBudget {
  month: string
  budget_kg: number
  used_kg: number
  daily_rate_kg: number
  status: 'on_track' | 'slightly_over' | 'significantly_over'
  days_remaining: number
  percentage_used: number
}

// ─── Narrative Types (Feature 3) ─────────────────────────────────────────

/** AI-generated weekly carbon narrative */
export interface WeeklyNarrative {
  week: string
  narrative_text: string
  weekly_total_kg: number
  vs_previous_week_percentage: number | null
  key_action_mentioned: string | null
  generated_at: string
}

// ─── Explainer Types (Feature 7) ─────────────────────────────────────────

/** AI-generated explanation for a specific emission category */
export interface ExplainerResponse {
  category: string
  explanation: string
  calculation_breakdown: string
  emission_factors_used: string
  source_citations: string
  monthly_kg: number
}

// ─── Common ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit?: number
  offset?: number
}