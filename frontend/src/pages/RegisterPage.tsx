/**
 * RegisterPage
 *
 * Full-screen authentication page for new user registration.
 * Redirects authenticated users to onboarding.
 */

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import RegisterForm from '../components/auth/RegisterForm'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function RegisterPage() {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size={48} label="Loading..." />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg w-full max-w-md animate-fade-in">
        <RegisterForm />
      </div>
    </main>
  )
}