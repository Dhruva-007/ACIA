/**
 * API Client
 *
 * Configured Axios instance for all ACIA backend communication.
 *
 * Key behaviors:
 * - Automatically attaches Firebase JWT to every request
 * - Handles token refresh transparently via Firebase SDK
 * - Unwraps the standard API response envelope
 * - Transforms API errors into consistent error objects
 * - Logs requests in development mode only
 */

import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { auth } from '../config/firebase'
import { API_BASE_URL } from '../utils/constants'

// ─── API Error Class ──────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly field?: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Axios Instance ───────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor ──────────────────────────────────────────────────

/**
 * Attaches Firebase ID token to every outgoing request.
 * Firebase SDK handles token refresh automatically when
 * getIdToken() is called — no manual refresh logic needed.
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const currentUser = auth.currentUser

    if (currentUser) {
      const token = await currentUser.getIdToken(false)
      config.headers.Authorization = `Bearer ${token}`
    }

    if (import.meta.env.DEV) {
      console.debug(`[ACIA API] ${config.method?.toUpperCase()} ${config.url}`)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// ─── Response Interceptor ─────────────────────────────────────────────────

/**
 * Unwraps the standard API response envelope.
 * Transforms { success: true, data: T } into T directly.
 * Transforms { success: false, error: {...} } into ApiError.
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data

    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success === true) {
        response.data = body.data
        return response
      }

      if (body.success === false) {
        throw new ApiError(
          body.error?.code ?? 'UNKNOWN_ERROR',
          body.error?.message ?? 'An unexpected error occurred',
          body.error?.field,
          response.status,
        )
      }
    }

    return response
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const body = error.response.data

        if (body?.success === false) {
          throw new ApiError(
            body.error?.code ?? 'API_ERROR',
            body.error?.message ?? 'An error occurred',
            body.error?.field,
            error.response.status,
          )
        }

        if (error.response.status === 401) {
          throw new ApiError('UNAUTHORIZED', 'Your session has expired. Please sign in again.', undefined, 401)
        }

        if (error.response.status === 429) {
          throw new ApiError('RATE_LIMITED', 'Too many requests. Please wait a moment before trying again.', undefined, 429)
        }

        if (error.response.status >= 500) {
          throw new ApiError('SERVER_ERROR', 'The server encountered an error. Please try again.', undefined, error.response.status)
        }
      }

      if (error.code === 'ECONNABORTED') {
        throw new ApiError('TIMEOUT', 'Request timed out. Please check your connection and try again.')
      }

      if (!error.response) {
        throw new ApiError('NETWORK_ERROR', 'Unable to connect to the server. Please check your internet connection.')
      }
    }

    throw error
  },
)

export default apiClient