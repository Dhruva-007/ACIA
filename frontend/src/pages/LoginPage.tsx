/**
 * LoginPage
 *
 * Full-screen authentication page for user sign-in.
 * Redirects authenticated users to dashboard.
 * Accessible: main landmark, proper heading hierarchy.
 */

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import LoginForm from '../components/auth/LoginForm'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function LoginPage() {
  const { user, initialized } = useAuthStore()

  // Still initializing auth
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size={48} label="Loading..." />
      </div>
    )
  }

  // Already authenticated — redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg w-full max-w-md animate-fade-in">
        <LoginForm />
      </div>
    </main>
  )
}