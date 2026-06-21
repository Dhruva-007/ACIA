/**
 * Tests: LoginForm Component
 *
 * Tests form validation, accessibility, and rendering.
 * Authentication calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils'

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    user: null,
    loading: false,
    initialized: true,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: null, pathname: '/login' }),
  }
})

const { default: LoginForm } = await import('../../../components/auth/LoginForm')

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields', () => {
    renderWithProviders(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    renderWithProviders(<LoginForm />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders Google sign in button', () => {
    renderWithProviders(<LoginForm />)
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
  })

  it('renders link to create account', () => {
    renderWithProviders(<LoginForm />)
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty form on submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      // Both email and password errors appear — use getAllByRole
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })

  it('shows email-specific validation error for invalid email format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'notanemail')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('email input has correct type attribute', () => {
    renderWithProviders(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
  })

  it('password input has correct type attribute', () => {
    renderWithProviders(<LoginForm />)
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
  })

  it('email input has autocomplete attribute', () => {
    renderWithProviders(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email')
  })

  it('shows email required error message text', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('email error disappears after user types valid email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    // Trigger email validation error
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })

    // Type a valid email — the email error should disappear
    await user.type(screen.getByLabelText(/email/i), 'valid@example.com')

    await waitFor(() => {
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
    })
  })
})