/**
 * Tests: MetricCard Component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricCard from '../../../components/shared/MetricCard'

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Today" value="12.50" />)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('12.50')).toBeInTheDocument()
  })

  it('renders unit when provided', () => {
    render(<MetricCard label="Today" value="12.50" unit="kg CO₂e" />)
    expect(screen.getByText('kg CO₂e')).toBeInTheDocument()
  })

  it('does not render unit when not provided', () => {
    render(<MetricCard label="Today" value="12.50" />)
    expect(screen.queryByText('kg CO₂e')).not.toBeInTheDocument()
  })

  it('renders trend text when provided', () => {
    render(<MetricCard label="Today" value="12.50" trend="-8.3% ↓" />)
    expect(screen.getByText('-8.3% ↓')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<MetricCard label="Today" value="12.50" icon="📊" />)
    expect(screen.getByText('📊')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <MetricCard label="Today" value="12.50" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('applies trendColor class to trend text', () => {
    render(
      <MetricCard
        label="Today"
        value="12.50"
        trend="-8.3% ↓"
        trendColor="text-green-600"
      />
    )
    const trendElement = screen.getByText('-8.3% ↓')
    expect(trendElement).toHaveClass('text-green-600')
  })
})