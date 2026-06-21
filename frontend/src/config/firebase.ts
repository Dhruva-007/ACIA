/**
 * Firebase Configuration and Initialization
 *
 * Reads Firebase configuration from environment variables.
 * All values are injected at build time via Vite's VITE_ prefix.
 * Never hardcode Firebase credentials in this file.
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

/**
 * Initialize Firebase app.
 * Uses getApps() to prevent re-initialization in hot reload scenarios.
 */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

/**
 * Firebase Authentication instance.
 * Used throughout the app for login, logout, and token management.
 */
export const auth = getAuth(app)

/**
 * Firebase Analytics instance (async).
 * Only initialized in environments that support it (not Node.js/SSR).
 */
export const analyticsPromise = isSupported().then((supported) => {
  if (supported && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    return getAnalytics(app)
  }
  return null
})

export default app