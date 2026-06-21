/**
 * Assistant Service
 *
 * API client methods for the AI Sustainability Assistant
 * powered by Vertex AI Gemini.
 */

import apiClient from './api'
import { API_ENDPOINTS } from '../utils/constants'
import type { AssistantChatRequest, AssistantResponse, ConversationSession } from '../types/api.types'

/**
 * Sends a message to the AI assistant and receives a response.
 */
export async function sendMessage(
  request: AssistantChatRequest
): Promise<AssistantResponse> {
  const response = await apiClient.post<AssistantResponse>(
    API_ENDPOINTS.ASSISTANT_CHAT,
    request
  )
  return response.data
}

/**
 * Retrieves conversation history for the current user.
 */
export async function getConversationHistory(): Promise<ConversationSession[]> {
  const response = await apiClient.get<ConversationSession[]>(
    API_ENDPOINTS.ASSISTANT_HISTORY
  )
  return response.data
}