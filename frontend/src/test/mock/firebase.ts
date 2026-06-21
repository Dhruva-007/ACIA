/**
 * Firebase Mock
 *
 * Mocks all Firebase modules used in the frontend.
 * Prevents real Firebase SDK calls during tests.
 */

import { vi } from 'vitest'

// Mock Firebase Auth
export const mockSignInWithEmailAndPassword = vi.fn()
export const mockCreateUserWithEmailAndPassword = vi.fn()
export const mockSignInWithPopup = vi.fn()
export const mockSignOut = vi.fn()
export const mockSendPasswordResetEmail = vi.fn()
export const mockUpdateProfile = vi.fn()
export const mockOnAuthStateChanged = vi.fn()
export const mockGetIdToken = vi.fn().mockResolvedValue('mock-firebase-token')

export const mockUser = {
  uid: 'test-user-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  getIdToken: mockGetIdToken,
}

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: mockUser,
  })),
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithPopup: mockSignInWithPopup,
  GoogleAuthProvider: vi.fn(() => ({
    addScope: vi.fn(),
  })),
  signOut: mockSignOut,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  updateProfile: mockUpdateProfile,
  onAuthStateChanged: mockOnAuthStateChanged,
  connectAuthEmulator: vi.fn(),
}))

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
  logEvent: vi.fn(),
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}))