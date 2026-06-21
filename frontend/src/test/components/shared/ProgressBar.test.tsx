/**
 * Tests: ProgressBar Component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressBar from '../../../components/shared/ProgressBar'

describe('ProgressBar', () => {
  it('renders with correct role', () => {
    render(<ProgressBar percentage={50} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('sets aria-valuenow correctly', () => {
    render(<ProgressBar percentage={75} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75')
  })

  it('sets aria-valuemin to 0', () => {
    render(<ProgressBar percentage={50} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0')
  })

  it('sets aria-valuemax to 100', () => {
    render(<ProgressBar percentage={50} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps percentage above 100 to 100', () => {
    render(<ProgressBar percentage={150} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('clamps percentage below 0 to 0', () => {
    render(<ProgressBar percentage={-10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('displays label when provided', () => {
    render(<ProgressBar percentage={60} label="Step 3 of 4" />)
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
  })

  it('displays percentage text when label is provided', () => {
    render(<ProgressBar percentage={60} label="Progress" />)
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('does not display percentage text without label', () => {
    render(<ProgressBar percentage={60} />)
    expect(screen.queryByText('60%')).not.toBeInTheDocument()
  })
})