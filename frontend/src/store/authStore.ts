/**
 * Authentication Store
 *
 * Zustand store managing global authentication state.
 * Initialized by the Firebase onAuthStateChanged listener
 * in useAuth hook. All components read auth state from here
 * rather than directly from Firebase to prevent redundant
 * Firebase SDK calls.
 */

import { create } from 'zustand'
import type { AuthUser, AuthState } from '../types/user.types'

interface AuthStore extends AuthState {
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  // ─── Initial State ──────────────────────────────────────────────────────
  user: null,
  loading: true,
  initialized: false,

  // ─── Actions ────────────────────────────────────────────────────────────

  /**
   * Sets the authenticated user. Called by onAuthStateChanged
   * when a user signs in or their token refreshes.
   */
  setUser: (user) =>
    set({
      user,
      loading: false,
      initialized: true,
    }),

  /**
   * Sets loading state during auth operations.
   */
  setLoading: (loading) => set({ loading }),

  /**
   * Marks the auth system as initialized.
   * Prevents flash of login screen on page load.
   */
  setInitialized: (initialized) => set({ initialized }),

  /**
   * Clears all auth state on logout.
   */
  clearAuth: () =>
    set({
      user: null,
      loading: false,
      initialized: true,
    }),
}))