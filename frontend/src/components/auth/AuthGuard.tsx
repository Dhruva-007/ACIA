/**
 * AuthGuard Component
 *
 * Protects routes that require authentication.
 *
 * Behavior:
 * 1. While Firebase auth is initializing → shows loading spinner
 * 2. If user is not authenticated → redirects to /login
 * 3. If user is authenticated → renders children
 *
 * This prevents:
 * - Flash of protected content before redirect
 * - Flash of login page on initial load before token is checked
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/shared/LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, initialized } = useAuthStore()
  const location = useLocation()

  // Auth state still initializing — show spinner to prevent flash
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size={48} label="Loading..." />
      </div>
    )
  }

  // Not authenticated — redirect to login with return URL
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  // Authenticated — render protected content
  return <>{children}</>
}