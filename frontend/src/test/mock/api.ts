/**
 * API Client Mock
 *
 * Mocks the axios-based API client.
 * Individual tests can override specific endpoint responses.
 */

import { vi } from 'vitest'

export const mockGet = vi.fn()
export const mockPost = vi.fn()
export const mockPut = vi.fn()

vi.mock('../services/api', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))