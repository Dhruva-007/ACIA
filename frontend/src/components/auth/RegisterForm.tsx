/**
 * RegisterForm Component
 *
 * Handles new user registration with email/password and Google OAuth.
 *
 * Validation:
 * - Display name: 2-50 characters
 * - Email: valid format
 * - Password: min 8 chars, at least 1 letter and 1 number
 * - Confirm password: must match password
 */

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateDisplayName,
} from '../../utils/validators'
import LoadingSpinner from '../../components/shared/LoadingSpinner'

interface FormErrors {
  displayName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterForm() {
  const { register, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  function validate(): boolean {
    const newErrors: FormErrors = {}

    const nameError = validateDisplayName(displayName)
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    const confirmError = validatePasswordConfirm(password, confirmPassword)

    if (nameError) newErrors.displayName = nameError
    if (emailError) newErrors.email = emailError
    if (passwordError) newErrors.password = passwordError
    if (confirmError) newErrors.confirmPassword = confirmError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function clearFieldError(field: keyof FormErrors): void {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()

    if (!validate()) return

    setIsLoading(true)
    try {
      await register(email, password, displayName)
      toast.success('Account created successfully!')
      navigate('/onboarding', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn(): Promise<void> {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      toast.success('Welcome!')
      navigate('/onboarding', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign in failed'
      if (message !== 'Sign-in cancelled.') {
        toast.error(message)
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const isSubmitting = isLoading || isGoogleLoading

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600 mb-2">Join ACIA</h1>
        <p className="text-slate-600">Start your personal carbon reduction journey</p>
      </div>

      {/* Google Sign Up */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGoogleLoading ? (
          <LoadingSpinner size={20} />
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-sm text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Display Name */}
        <div className="mb-4">
          <label htmlFor="register-name" className="label-base">
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              clearFieldError('displayName')
            }}
            className={`input-base ${errors.displayName ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            placeholder="Your name"
            autoComplete="name"
            disabled={isSubmitting}
            aria-invalid={!!errors.displayName}
            aria-describedby={errors.displayName ? 'register-name-error' : undefined}
          />
          {errors.displayName && (
            <p id="register-name-error" className="error-text" role="alert">
              {errors.displayName}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="mb-4">
          <label htmlFor="register-email" className="label-base">
            Email address
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearFieldError('email')
            }}
            className={`input-base ${errors.email ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
          />
          {errors.email && (
            <p id="register-email-error" className="error-text" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-4">
          <label htmlFor="register-password" className="label-base">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clearFieldError('password')
            }}
            className={`input-base ${errors.password ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'register-password-error' : undefined}
          />
          {errors.password && (
            <p id="register-password-error" className="error-text" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <label htmlFor="register-confirm" className="label-base">
            Confirm password
          </label>
          <input
            id="register-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              clearFieldError('confirmPassword')
            }}
            className={`input-base ${errors.confirmPassword ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            placeholder="Repeat your password"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
          />
          {errors.confirmPassword && (
            <p id="register-confirm-error" className="error-text" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full py-3"
        >
          {isLoading ? (
            <LoadingSpinner size={20} />
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}