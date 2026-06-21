/**
 * Authentication Service
 *
 * Wraps Firebase Authentication SDK operations.
 * Components and hooks import from here — never from Firebase directly.
 * This abstraction makes auth operations mockable in tests
 * and Firebase-version upgrades isolated to this file.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '../config/firebase'
import type { AuthUser } from '../types/user.types'

// ─── Type Conversion ──────────────────────────────────────────────────────

/**
 * Converts a Firebase User object to our internal AuthUser type.
 * Keeps Firebase types isolated to this service file.
 */
export function firebaseUserToAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  }
}

// ─── Auth Operations ──────────────────────────────────────────────────────

/**
 * Signs in a user with email and password.
 *
 * @throws Firebase AuthError if credentials are invalid
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return firebaseUserToAuthUser(credential.user)
}

/**
 * Registers a new user with email, password, and display name.
 *
 * @throws Firebase AuthError if email is already in use
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)

  await updateProfile(credential.user, { displayName })

  return firebaseUserToAuthUser(credential.user)
}

/**
 * Signs in a user with Google OAuth popup.
 *
 * @throws Firebase AuthError if popup is blocked or cancelled
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  const provider = new GoogleAuthProvider()
  provider.addScope('email')
  provider.addScope('profile')

  const credential = await signInWithPopup(auth, provider)
  return firebaseUserToAuthUser(credential.user)
}

/**
 * Signs out the current user.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth)
}

/**
 * Sends a password reset email to the specified address.
 *
 * @throws Firebase AuthError if email is not registered
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

/**
 * Subscribes to Firebase auth state changes.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param callback - Called with AuthUser on sign in, null on sign out
 */
export function subscribeToAuthState(
  callback: (user: AuthUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback(firebaseUserToAuthUser(firebaseUser))
    } else {
      callback(null)
    }
  })
}

// ─── Error Message Helpers ────────────────────────────────────────────────

/**
 * Converts Firebase auth error codes to user-friendly messages.
 * Firebase error codes are technical strings that should never
 * be shown directly to users.
 */
export function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/cancelled-popup-request': 'Sign-in cancelled.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
  }

  return errorMessages[errorCode] ?? 'An unexpected error occurred. Please try again.'
}