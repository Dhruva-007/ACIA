/**
 * User Domain Types
 *
 * Defines all data structures for user profiles, authentication
 * state, and application settings.
 */

import type { UserLifestyleInput } from './carbon.types'

// ─── Authentication ───────────────────────────────────────────────────────

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
}

// ─── User Profile ─────────────────────────────────────────────────────────

export interface UserSettings {
  units: 'metric' | 'imperial'
  notifications_enabled: boolean
  theme: 'light' | 'dark'
}

export interface UserProfile {
  uid: string
  email: string
  display_name: string
  created_at: string
  updated_at: string
  onboarding_completed: boolean
  settings: UserSettings
}

export interface UserProfileWithLifestyle extends UserProfile {
  lifestyle: UserLifestyleInput
}

// ─── Onboarding ───────────────────────────────────────────────────────────

export type OnboardingStep = 'transport' | 'energy' | 'food' | 'shopping' | 'complete'

export interface OnboardingState {
  current_step: OnboardingStep
  completed_steps: OnboardingStep[]
  data: Partial<UserLifestyleInput>
}