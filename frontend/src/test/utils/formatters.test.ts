/**
 * Tests: Formatter Utilities
 *
 * Tests all formatting functions for correct output.
 * These are pure functions — no mocking needed.
 */

import { describe, it, expect } from 'vitest'
import {
  formatCarbonKg,
  formatCarbonCompact,
  formatPercentageChange,
  getTrendColorClass,
  formatTrendDisplay,
  formatVsGlobalAverage,
  formatScoreLabel,
  getScoreColorClass,
  getScoreBarColorClass,
  getCIILevel,
  getCIIColorClass,
  getCIIStrokeColor,
  formatBudgetStatus,
  formatDate,
  formatDateShort,
  formatMonth,
  formatRelativeTime,
  formatNumber,
  clamp,
} from '../../utils/formatters'

describe('formatCarbonKg', () => {
  it('formats values under 1 kg as grams', () => {
    expect(formatCarbonKg(0.5)).toBe('500 g CO₂e')
  })

  it('formats values between 1 and 1000 as kg', () => {
    expect(formatCarbonKg(12.5)).toBe('12.50 kg CO₂e')
  })

  it('formats values over 1000 as tonnes', () => {
    expect(formatCarbonKg(1500)).toBe('1.50 t CO₂e')
  })

  it('includes CO₂e unit suffix', () => {
    expect(formatCarbonKg(10)).toContain('CO₂e')
  })
})

describe('formatCarbonCompact', () => {
  it('returns tuple of value and kg unit for small values', () => {
    const [value, unit] = formatCarbonCompact(12.5)
    expect(value).toBe('12.50')
    expect(unit).toBe('kg CO₂e')
  })

  it('returns tuple of value and tonne unit for large values', () => {
    const [value, unit] = formatCarbonCompact(1500)
    expect(value).toBe('1.50')
    expect(unit).toBe('t CO₂e')
  })
})

describe('formatPercentageChange', () => {
  it('formats positive change with plus sign and up arrow', () => {
    expect(formatPercentageChange(12.5)).toBe('+12.5% ↑')
  })

  it('formats negative change with minus sign and down arrow', () => {
    expect(formatPercentageChange(-8.3)).toBe('-8.3% ↓')
  })

  it('formats zero change with neutral arrow', () => {
    expect(formatPercentageChange(0)).toBe('0.0% →')
  })
})

describe('getTrendColorClass', () => {
  it('returns green for significant decrease (good for emissions)', () => {
    expect(getTrendColorClass(-10)).toBe('text-green-600')
  })

  it('returns red for significant increase (bad for emissions)', () => {
    expect(getTrendColorClass(10)).toBe('text-red-500')
  })

  it('returns amber for small changes', () => {
    expect(getTrendColorClass(1)).toBe('text-amber-500')
  })
})

describe('formatTrendDisplay', () => {
  it('returns trend message for new_user state', () => {
    const result = formatTrendDisplay('new_user', null, 'Track for 5 more days')
    expect(result).toBe('Track for 5 more days')
  })

  it('returns formatted percentage for valid trend', () => {
    const result = formatTrendDisplay('decreasing', -8.3)
    expect(result).toBe('-8.3% ↓')
  })

  it('returns default message when percentage is null', () => {
    const result = formatTrendDisplay('stable', null)
    expect(result).toContain('Track')
  })
})

describe('formatVsGlobalAverage', () => {
  it('returns above message for positive percentage', () => {
    expect(formatVsGlobalAverage(6.2)).toContain('above')
  })

  it('returns below message for negative percentage', () => {
    expect(formatVsGlobalAverage(-12.5)).toContain('below')
  })

  it('includes absolute percentage value', () => {
    expect(formatVsGlobalAverage(-12.5)).toContain('12.5')
  })
})

describe('formatScoreLabel', () => {
  it('returns High for scores >= 70', () => {
    expect(formatScoreLabel(70)).toBe('High')
    expect(formatScoreLabel(100)).toBe('High')
  })

  it('returns Medium for scores 40-69', () => {
    expect(formatScoreLabel(40)).toBe('Medium')
    expect(formatScoreLabel(69)).toBe('Medium')
  })

  it('returns Low for scores below 40', () => {
    expect(formatScoreLabel(0)).toBe('Low')
    expect(formatScoreLabel(39)).toBe('Low')
  })
})

describe('getScoreColorClass', () => {
  it('returns green for high scores', () => {
    expect(getScoreColorClass(80)).toBe('text-green-600')
  })

  it('returns amber for medium scores', () => {
    expect(getScoreColorClass(55)).toBe('text-amber-500')
  })

  it('returns red for low scores', () => {
    expect(getScoreColorClass(20)).toBe('text-red-500')
  })
})

describe('getScoreBarColorClass', () => {
  it('returns green bar for high scores', () => {
    expect(getScoreBarColorClass(80)).toBe('bg-green-500')
  })

  it('returns amber bar for medium scores', () => {
    expect(getScoreBarColorClass(55)).toBe('bg-amber-400')
  })

  it('returns red bar for low scores', () => {
    expect(getScoreBarColorClass(20)).toBe('bg-red-400')
  })
})

describe('getCIILevel', () => {
  it('returns Excellent for scores >= 80', () => {
    expect(getCIILevel(80)).toBe('Excellent')
    expect(getCIILevel(100)).toBe('Excellent')
  })

  it('returns Good for scores 60-79', () => {
    expect(getCIILevel(60)).toBe('Good')
    expect(getCIILevel(79)).toBe('Good')
  })

  it('returns Fair for scores 40-59', () => {
    expect(getCIILevel(40)).toBe('Fair')
    expect(getCIILevel(59)).toBe('Fair')
  })

  it('returns Needs Improvement for scores below 40', () => {
    expect(getCIILevel(0)).toBe('Needs Improvement')
    expect(getCIILevel(39)).toBe('Needs Improvement')
  })
})

describe('getCIIColorClass', () => {
  it('returns green for excellent scores', () => {
    expect(getCIIColorClass(85)).toBe('text-green-600')
  })

  it('returns blue for good scores', () => {
    expect(getCIIColorClass(65)).toBe('text-blue-600')
  })

  it('returns amber for fair scores', () => {
    expect(getCIIColorClass(45)).toBe('text-amber-500')
  })

  it('returns red for poor scores', () => {
    expect(getCIIColorClass(20)).toBe('text-red-500')
  })
})

describe('getCIIStrokeColor', () => {
  it('returns green hex for excellent scores', () => {
    expect(getCIIStrokeColor(85)).toBe('#16a34a')
  })

  it('returns blue hex for good scores', () => {
    expect(getCIIStrokeColor(65)).toBe('#2563eb')
  })
})

describe('formatBudgetStatus', () => {
  it('returns on track for usage <= 80%', () => {
    const result = formatBudgetStatus(75)
    expect(result.label).toBe('On Track')
    expect(result.colorClass).toContain('green')
  })

  it('returns close to limit for usage 80-100%', () => {
    const result = formatBudgetStatus(90)
    expect(result.label).toBe('Close to Limit')
    expect(result.colorClass).toContain('amber')
  })

  it('returns over budget for usage > 100%', () => {
    const result = formatBudgetStatus(120)
    expect(result.label).toBe('Over Budget')
    expect(result.colorClass).toContain('red')
  })
})

describe('formatDate', () => {
  it('formats ISO date string to readable format', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('Jan')
    expect(result).toContain('2024')
  })
})

describe('formatDateShort', () => {
  it('formats ISO date string to short format without year', () => {
    const result = formatDateShort('2024-01-15')
    expect(result).toContain('Jan')
    expect(result).not.toContain('2024')
  })
})

describe('formatMonth', () => {
  it('formats YYYY-MM string to full month name and year', () => {
    const result = formatMonth('2024-01')
    expect(result).toContain('January')
    expect(result).toContain('2024')
  })
})

describe('formatRelativeTime', () => {
  it('returns Just now for very recent timestamps', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('Just now')
  })

  it('returns minutes ago for recent timestamps', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString()
    expect(formatRelativeTime(fiveMinutesAgo)).toContain('minute')
  })

  it('returns hours ago for timestamps within a day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString()
    expect(formatRelativeTime(twoHoursAgo)).toContain('hour')
  })

  it('returns days ago for older timestamps', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    expect(formatRelativeTime(threeDaysAgo)).toContain('day')
  })
})

describe('formatNumber', () => {
  it('formats number with comma separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('formats number with specified decimal places', () => {
    expect(formatNumber(12.5, 1)).toBe('12.5')
  })
})

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50)
  })

  it('clamps to minimum when below range', () => {
    expect(clamp(-10, 0, 100)).toBe(0)
  })

  it('clamps to maximum when above range', () => {
    expect(clamp(150, 0, 100)).toBe(100)
  })
})