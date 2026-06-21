/**
 * AssistantPage
 *
 * AI Sustainability Assistant page with:
 * - Full chat interface with message history
 * - Conversation session management
 * - Context indicator showing which user data informs responses
 * - Suggested starter questions
 *
 * Directly addresses:
 * - Smart dynamic assistant: conversational AI with user context
 * - EXPLAIN: AI provides understandable reasoning
 * - REDUCE: AI suggests personalized actions
 * - Practical usability: natural language interaction
 */

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sendMessage, getConversationHistory } from '../services/assistantService'
import { Analytics } from '../services/analyticsService'
import { QUERY_KEYS } from '../utils/constants'
import ChatInterface from '../components/assistant/ChatInterface'
import ConversationHistory from '../components/assistant/ConversationHistory'
import type { AssistantMessage } from '../types/api.types'

export default function AssistantPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [contextUsed, setContextUsed] = useState<string[]>([])
  const queryClient = useQueryClient()

  // Fetch conversation history
  const conversationHistory = useQuery({
    queryKey: QUERY_KEYS.ASSISTANT_HISTORY,
    queryFn: getConversationHistory,
    staleTime: 60 * 1000,
  })

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (response) => {
      // Add assistant response to messages
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setSessionId(response.session_id)
      setContextUsed(response.context_used)

      // Track analytics
      Analytics.assistantMessageSent(messages.length + 2)

      // Invalidate conversation history to show new session
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ASSISTANT_HISTORY })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to get response'
      toast.error(message)

      // Add error message as assistant response
      const errorMessage: AssistantMessage = {
        role: 'assistant',
        content: 'I apologize, but I\'m unable to process your request right now. Please try again in a moment. If the issue persists, check your internet connection.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    },
  })

  const handleSendMessage = useCallback(
    (content: string) => {
      // Add user message to list immediately
      const userMessage: AssistantMessage = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Send to backend
      sendMutation.mutate({
        message: content,
        session_id: sessionId ?? undefined,
      })
    },
    [sessionId, sendMutation],
  )

  const handleNewConversation = useCallback(() => {
    setSessionId(null)
    setMessages([])
    setContextUsed([])
  }, [])

  const handleSelectSession = useCallback(
    (selectedSessionId: string) => {
      const session = conversationHistory.data?.find(
        (s) => s.session_id === selectedSessionId
      )
      if (session) {
        setSessionId(session.session_id)
        setMessages(session.messages)
        setContextUsed([])
      }
    },
    [conversationHistory.data],
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">AI Assistant</h2>
        <p className="text-slate-600 mt-1">
          Your personal sustainability copilot — powered by your actual profile data
        </p>
      </div>

      {/* Context Banner */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-xl p-4">
        <p className="text-sm text-primary-800">
          <span className="font-medium">🧠 Personalized responses: </span>
          Unlike generic chatbots, ACIA uses your actual emission data, behavioral history,
          and lifestyle profile to provide specific, actionable answers with real numbers.
        </p>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Interface - 3 columns */}
        <div className="lg:col-span-3">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={sendMutation.isPending}
            contextUsed={contextUsed}
          />
        </div>

        {/* Conversation History - 1 column */}
        <div className="hidden lg:block">
          <ConversationHistory
            sessions={conversationHistory.data ?? []}
            activeSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewConversation={handleNewConversation}
            isLoading={conversationHistory.isLoading}
          />
        </div>
      </div>

      {/* Mobile conversation history toggle */}
      <div className="lg:hidden">
        <details className="bg-white rounded-2xl border border-slate-200">
          <summary className="px-5 py-3 text-sm font-medium text-slate-700 cursor-pointer">
            📜 Previous Conversations ({conversationHistory.data?.length ?? 0})
          </summary>
          <div className="px-5 pb-4">
            <ConversationHistory
              sessions={conversationHistory.data ?? []}
              activeSessionId={sessionId}
              onSelectSession={handleSelectSession}
              onNewConversation={handleNewConversation}
              isLoading={conversationHistory.isLoading}
            />
          </div>
        </details>
      </div>
    </div>
  )
}