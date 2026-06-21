/**
 * useAuth Hook
 *
 * Initializes and manages Firebase Authentication state.
 * Sets up the onAuthStateChanged listener on mount and
 * cleans it up on unmount to prevent memory leaks.
 *
 * Returns auth state from the Zustand store plus auth
 * operations wrapped in error handling.
 */

import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import type { AuthUser } from '../types/user.types'
import {
  subscribeToAuthState,
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  signOutUser,
  resetPassword,
  getAuthErrorMessage,
} from '../services/authService'

export interface UseAuthReturn {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const { user, loading, initialized, setUser, setLoading, clearAuth } = useAuthStore()

  // ─── Initialize Auth Listener ─────────────────────────────────────────

  useEffect(() => {
    /**
     * Subscribe to Firebase auth state changes.
     * This runs once on mount and fires whenever the user
     * signs in, signs out, or their token refreshes.
     */
    const unsubscribe = subscribeToAuthState((authUser) => {
      setUser(authUser)
    })

    return () => {
      unsubscribe()
    }
  }, [setUser])

  // ─── Auth Operations ──────────────────────────────────────────────────

  async function signIn(email: string, password: string): Promise<void> {
    setLoading(true)
    try {
      await signInWithEmail(email, password)
    } catch (error: unknown) {
      setLoading(false)
      const code = (error as { code?: string }).code ?? ''
      throw new Error(getAuthErrorMessage(code))
    }
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> {
    setLoading(true)
    try {
      await registerWithEmail(email, password, displayName)
    } catch (error: unknown) {
      setLoading(false)
      const code = (error as { code?: string }).code ?? ''
      throw new Error(getAuthErrorMessage(code))
    }
  }

  async function handleSignInWithGoogle(): Promise<void> {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (error: unknown) {
      setLoading(false)
      const code = (error as { code?: string }).code ?? ''
      throw new Error(getAuthErrorMessage(code))
    }
  }

  async function signOut(): Promise<void> {
    try {
      await signOutUser()
      clearAuth()
    } catch (error: unknown) {
      throw new Error('Failed to sign out. Please try again.')
    }
  }

  async function sendPasswordReset(email: string): Promise<void> {
    try {
      await resetPassword(email)
    } catch (error: unknown) {
      const code = (error as { code?: string }).code ?? ''
      throw new Error(getAuthErrorMessage(code))
    }
  }

  return {
    user,
    loading,
    initialized,
    signIn,
    register,
    signInWithGoogle: handleSignInWithGoogle,
    signOut,
    sendPasswordReset,
  }
}