/**
 * Tests: LoadingSpinner Component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../../../components/shared/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
  })

  it('has default aria-label of Loading', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading')
  })

  it('uses custom label when provided', () => {
    render(<LoadingSpinner label="Calculating..." />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Calculating...')
    expect(screen.getByText('Calculating...')).toBeInTheDocument()
  })

  it('applies custom className to container', () => {
    render(<LoadingSpinner className="my-custom-class" />)
    const container = screen.getByRole('status')
    expect(container).toHaveClass('my-custom-class')
  })

  it('renders SVG spinner element', () => {
    const { container } = render(<LoadingSpinner />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})