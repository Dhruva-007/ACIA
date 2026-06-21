/**
 * Test Utilities
 *
 * Provides a custom render function that wraps components
 * with all required context providers:
 * - QueryClientProvider (React Query)
 * - MemoryRouter (React Router)
 * - Toaster (react-hot-toast)
 *
 * Import renderWithProviders instead of @testing-library/react render
 * for all component tests that need routing or data fetching.
 */

import { type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Creates a fresh QueryClient for each test to prevent state leakage.
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,        // Never retry in tests
        staleTime: Infinity, // Never refetch in tests
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function AllProviders({ children }: ProvidersProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Toaster />
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/**
 * Custom render function with all providers.
 * Use this instead of @testing-library/react render.
 */
function renderWithProviders(
  ui: ReactNode,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything from testing library for convenience
export * from '@testing-library/react'
export { renderWithProviders }