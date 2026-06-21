/**
 * App Root Component
 *
 * Complete routing structure:
 * - Public routes: /login, /register
 * - Onboarding: /onboarding (protected, no sidebar)
 * - Dashboard routes: all other pages (protected, with sidebar layout)
 *
 * DashboardLayout uses <Outlet /> to render child routes,
 * giving every page the sidebar and top bar automatically.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import ErrorBoundary from './components/shared/ErrorBoundary'
import ToastNotification from './components/shared/ToastNotification'
import AuthGuard from './components/auth/AuthGuard'
import DashboardLayout from './components/dashboard/DashboardLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import TrackingPage from './pages/TrackingPage'
import RecommendationsPage from './pages/RecommendationsPage'
import SimulatorPage from './pages/SimulatorPage'
import PredictionPage from './pages/PredictionPage'
import AssistantPage from './pages/AssistantPage'
import CIIPage from './pages/CIIPage'
import SettingsPage from './pages/SettingsPage'

// ─── React Query Client ───────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// ─── App Routes ───────────────────────────────────────────────────────────

function AppRoutes() {
  useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Onboarding - protected but no sidebar */}
      <Route
        path="/onboarding"
        element={
          <AuthGuard>
            <OnboardingPage />
          </AuthGuard>
        }
      />

      {/* Dashboard routes - protected with sidebar layout */}
      <Route
        element={
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/cii" element={<CIIPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastNotification />
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}