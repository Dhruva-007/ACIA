/**
 * DashboardLayout Component
 *
 * Main application shell with:
 * - Collapsible sidebar navigation
 * - Top bar with user info and sign-out
 * - Responsive: sidebar collapses on mobile
 * - Active route highlighting
 *
 * Every authenticated page is rendered inside this layout.
 *
 * Accessibility:
 * - nav landmark for sidebar
 * - main landmark for content
 * - aria-current for active nav item
 * - Keyboard navigable
 */

import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../shared/LoadingSpinner'

interface NavItem {
  path: string
  label: string
  icon: string
  description: string
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: '📊',
    description: 'Overview of your carbon footprint',
  },
  {
    path: '/tracking',
    label: 'Tracking',
    icon: '📈',
    description: 'Track emissions over time',
  },
  {
    path: '/recommendations',
    label: 'Recommendations',
    icon: '💡',
    description: 'Personalized actions to reduce emissions',
  },
  {
    path: '/simulator',
    label: 'Simulator',
    icon: '🔬',
    description: 'Simulate lifestyle changes',
  },
  {
    path: '/prediction',
    label: 'Prediction',
    icon: '🔮',
    description: 'Future emission projections',
  },
  {
    path: '/assistant',
    label: 'AI Assistant',
    icon: '🤖',
    description: 'Chat with your sustainability copilot',
  },
  {
    path: '/cii',
    label: 'CII Score',
    icon: '🏆',
    description: 'Carbon Improvement Index',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: '⚙️',
    description: 'Profile and preferences',
  },
]

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut(): Promise<void> {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setSigningOut(false)
    }
  }

  const displayName = user?.displayName || user?.email || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="h-full flex flex-col" aria-label="Main navigation">
          {/* Logo */}
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-xl font-bold text-primary-600">ACIA</h1>
            <p className="text-xs text-slate-400 mt-0.5">Carbon Intelligence Assistant</p>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="text-lg" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="sr-only">(current page)</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {displayName}
                </p>
                {user?.email && (
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 disabled:opacity-50"
            >
              {signingOut ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size={14} />
                  Signing out...
                </span>
              ) : (
                '← Sign Out'
              )}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Open navigation menu"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Page context - empty for now, pages can inject content */}
            <div className="flex-1" />

            {/* Desktop user info */}
            <div className="hidden lg:flex items-center gap-3">
              <span className="text-sm text-slate-500">
                Welcome, <span className="font-medium text-slate-700">{user?.displayName || 'there'}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}