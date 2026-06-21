/**
 * Input Validators
 *
 * Pure validation functions for all user-submitted form inputs.
 * Each function returns a string error message or null if valid.
 * Used by onboarding forms and settings forms.
 */

// ─── Auth Validators ──────────────────────────────────────────────────────

/**
 * Validates an email address format.
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return null
}

/**
 * Validates a password for registration.
 * Minimum 8 characters, at least one letter and one number.
 */
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
  return null
}

/**
 * Validates password confirmation matches.
 */
export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password'
  if (password !== confirm) return 'Passwords do not match'
  return null
}

/**
 * Validates a display name.
 */
export function validateDisplayName(name: string): string | null {
  if (!name.trim()) return 'Name is required'
  if (name.trim().length < 2) return 'Name must be at least 2 characters'
  if (name.trim().length > 50) return 'Name must be under 50 characters'
  return null
}

// ─── Transport Validators ─────────────────────────────────────────────────

/**
 * Validates daily commute distance in km.
 */
export function validateDailyDistance(value: number | string): string | null {
  const num = Number(value)
  if (isNaN(num)) return 'Please enter a valid number'
  if (num < 0) return 'Distance cannot be negative'
  if (num > 2000) return 'Distance seems too high. Please check your entry'
  return null
}

/**
 * Validates weekly flight hours.
 */
export function validateFlightHours(value: number | string): string | null {
  const num = Number(value)
  if (isNaN(num)) return 'Please enter a valid number'
  if (num < 0) return 'Hours cannot be negative'
  if (num > 168) return 'Cannot exceed 168 hours per week'
  return null
}

// ─── Energy Validators ────────────────────────────────────────────────────

/**
 * Validates monthly electricity consumption in kWh.
 */
export function validateMonthlyKwh(value: number | string): string | null {
  const num = Number(value)
  if (isNaN(num)) return 'Please enter a valid number'
  if (num < 0) return 'Consumption cannot be negative'
  if (num > 99999) return 'Value seems too high. Please check your entry'
  return null
}

/**
 * Validates household size.
 */
export function validateHouseholdSize(value: number | string): string | null {
  const num = Number(value)
  if (isNaN(num) || !Number.isInteger(num)) return 'Please enter a whole number'
  if (num < 1) return 'Household size must be at least 1'
  if (num > 20) return 'Household size seems too high. Please check your entry'
  return null
}

// ─── Shopping Validators ──────────────────────────────────────────────────

/**
 * Validates a percentage value (0-100).
 */
export function validatePercentage(value: number | string, fieldName: string): string | null {
  const num = Number(value)
  if (isNaN(num)) return `Please enter a valid number for ${fieldName}`
  if (num < 0 || num > 100) return `${fieldName} must be between 0 and 100`
  return null
}

/**
 * Validates yearly electronics purchases.
 */
export function validateElectronicsYearly(value: number | string): string | null {
  const num = Number(value)
  if (isNaN(num) || !Number.isInteger(num)) return 'Please enter a whole number'
  if (num < 0) return 'Cannot be negative'
  if (num > 100) return 'Value seems too high. Please check your entry'
  return null
}

// ─── Simulator Validators ─────────────────────────────────────────────────

/**
 * Validates trips per week for simulator.
 */
export function validateTripsPerWeek(value: number | string): string | null {
  const num = Number(value)
  if (isNaN(num) || !Number.isInteger(num)) return 'Please enter a whole number'
  if (num < 1) return 'Must be at least 1 trip'
  if (num > 30) return 'Value seems too high'
  return null
}

/**
 * Validates meals changed per week for diet simulator.
 */
export function validateMealsPerWeek(value: number | string): string | null {
  const num = Number(value)
  if (isNaN(num) || !Number.isInteger(num)) return 'Please enter a whole number'
  if (num < 1) return 'Must be at least 1 meal'
  if (num > 21) return 'Cannot exceed 21 meals per week'
  return null
}

// ─── Chat Validators ──────────────────────────────────────────────────────

/**
 * Validates AI assistant message input.
 */
export function validateChatMessage(message: string): string | null {
  if (!message.trim()) return 'Please enter a message'
  if (message.length > 1000) return 'Message must be under 1000 characters'
  return null
}