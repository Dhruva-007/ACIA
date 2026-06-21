/**
 * Tests: Validator Utilities
 *
 * Tests all validation functions for correct behavior.
 * Pure functions — no mocking needed.
 */

import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateDisplayName,
  validateDailyDistance,
  validateFlightHours,
  validateMonthlyKwh,
  validateHouseholdSize,
  validatePercentage,
  validateElectronicsYearly,
  validateChatMessage,
} from '../../utils/validators'

describe('validateEmail', () => {
  it('returns null for valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull()
  })

  it('returns error for empty email', () => {
    expect(validateEmail('')).not.toBeNull()
  })

  it('returns error for email without @', () => {
    expect(validateEmail('notanemail')).not.toBeNull()
  })

  it('returns error for email without domain', () => {
    expect(validateEmail('user@')).not.toBeNull()
  })

  it('returns error for whitespace only', () => {
    expect(validateEmail('   ')).not.toBeNull()
  })
})

describe('validatePassword', () => {
  it('returns null for valid password', () => {
    expect(validatePassword('Password123')).toBeNull()
  })

  it('returns error for password under 8 characters', () => {
    expect(validatePassword('Pass1')).not.toBeNull()
  })

  it('returns error for password without letters', () => {
    expect(validatePassword('12345678')).not.toBeNull()
  })

  it('returns error for password without numbers', () => {
    expect(validatePassword('PasswordOnly')).not.toBeNull()
  })

  it('returns error for empty password', () => {
    expect(validatePassword('')).not.toBeNull()
  })
})

describe('validatePasswordConfirm', () => {
  it('returns null when passwords match', () => {
    expect(validatePasswordConfirm('Password123', 'Password123')).toBeNull()
  })

  it('returns error when passwords do not match', () => {
    expect(validatePasswordConfirm('Password123', 'Different123')).not.toBeNull()
  })

  it('returns error when confirm is empty', () => {
    expect(validatePasswordConfirm('Password123', '')).not.toBeNull()
  })
})

describe('validateDisplayName', () => {
  it('returns null for valid name', () => {
    expect(validateDisplayName('John Doe')).toBeNull()
  })

  it('returns error for empty name', () => {
    expect(validateDisplayName('')).not.toBeNull()
  })

  it('returns error for single character name', () => {
    expect(validateDisplayName('J')).not.toBeNull()
  })

  it('returns error for name over 50 characters', () => {
    expect(validateDisplayName('A'.repeat(51))).not.toBeNull()
  })
})

describe('validateDailyDistance', () => {
  it('returns null for valid distance', () => {
    expect(validateDailyDistance(15)).toBeNull()
    expect(validateDailyDistance(0)).toBeNull()
  })

  it('returns error for negative distance', () => {
    expect(validateDailyDistance(-1)).not.toBeNull()
  })

  it('returns error for distance over 2000', () => {
    expect(validateDailyDistance(2001)).not.toBeNull()
  })

  it('returns error for non-numeric value', () => {
    expect(validateDailyDistance('abc')).not.toBeNull()
  })
})

describe('validateFlightHours', () => {
  it('returns null for valid hours', () => {
    expect(validateFlightHours(2)).toBeNull()
    expect(validateFlightHours(0)).toBeNull()
  })

  it('returns error for negative hours', () => {
    expect(validateFlightHours(-1)).not.toBeNull()
  })

  it('returns error for hours over 168', () => {
    expect(validateFlightHours(169)).not.toBeNull()
  })
})

describe('validateMonthlyKwh', () => {
  it('returns null for valid consumption', () => {
    expect(validateMonthlyKwh(300)).toBeNull()
    expect(validateMonthlyKwh(0)).toBeNull()
  })

  it('returns error for negative value', () => {
    expect(validateMonthlyKwh(-1)).not.toBeNull()
  })
})

describe('validateHouseholdSize', () => {
  it('returns null for valid household size', () => {
    expect(validateHouseholdSize(3)).toBeNull()
    expect(validateHouseholdSize(1)).toBeNull()
  })

  it('returns error for zero', () => {
    expect(validateHouseholdSize(0)).not.toBeNull()
  })

  it('returns error for size over 20', () => {
    expect(validateHouseholdSize(21)).not.toBeNull()
  })

  it('returns error for non-integer', () => {
    expect(validateHouseholdSize(2.5)).not.toBeNull()
  })
})

describe('validatePercentage', () => {
  it('returns null for valid percentage', () => {
    expect(validatePercentage(50, 'Test')).toBeNull()
    expect(validatePercentage(0, 'Test')).toBeNull()
    expect(validatePercentage(100, 'Test')).toBeNull()
  })

  it('returns error for value below 0', () => {
    expect(validatePercentage(-1, 'Test')).not.toBeNull()
  })

  it('returns error for value above 100', () => {
    expect(validatePercentage(101, 'Test')).not.toBeNull()
  })
})

describe('validateElectronicsYearly', () => {
  it('returns null for valid number', () => {
    expect(validateElectronicsYearly(2)).toBeNull()
    expect(validateElectronicsYearly(0)).toBeNull()
  })

  it('returns error for negative number', () => {
    expect(validateElectronicsYearly(-1)).not.toBeNull()
  })

  it('returns error for number over 100', () => {
    expect(validateElectronicsYearly(101)).not.toBeNull()
  })
})

describe('validateChatMessage', () => {
  it('returns null for valid message', () => {
    expect(validateChatMessage('Hello, how can I reduce my footprint?')).toBeNull()
  })

  it('returns error for empty message', () => {
    expect(validateChatMessage('')).not.toBeNull()
    expect(validateChatMessage('   ')).not.toBeNull()
  })

  it('returns error for message over 1000 characters', () => {
    expect(validateChatMessage('A'.repeat(1001))).not.toBeNull()
  })

  it('accepts message of exactly 1000 characters', () => {
    expect(validateChatMessage('A'.repeat(1000))).toBeNull()
  })
})