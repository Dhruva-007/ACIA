/**
 * ChatInterface Component
 *
 * Complete chat interface for the AI Sustainability Assistant.
 *
 * Features:
 * - Message list with auto-scroll to latest message
 * - Text input with send button and Enter key support
 * - Loading state while waiting for AI response
 * - Context indicator showing what user data the AI uses
 * - Character counter and validation
 * - Welcome message for empty conversations
 *
 * Accessibility:
 * - Input has proper label
 * - Messages in role="list" container
 * - Status updates announced via aria-live
 * - Submit button disabled during loading
 */

import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { validateChatMessage } from '../../utils/validators'
import type { AssistantMessage } from '../../types/api.types'

interface ChatInterfaceProps {
  messages: AssistantMessage[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  contextUsed: string[]
}

const SUGGESTED_QUESTIONS = [
  'What is my biggest source of emissions?',
  'How can I reduce my transport footprint?',
  'What dietary changes would have the most impact?',
  'How does my footprint compare to the average?',
  'What would happen if I worked from home 2 days a week?',
]

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  contextUsed,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(): void {
    const trimmed = input.trim()
    const validationError = validateChatMessage(trimmed)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    onSendMessage(trimmed)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input.trim()) {
        handleSubmit()
      }
    }
  }

  function handleSuggestedQuestion(question: string): void {
    onSendMessage(question)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 flex flex-col h-[600px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-lg" aria-hidden="true">🤖</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">ACIA Assistant</h3>
            <p className="text-xs text-slate-400">Powered by Vertex AI Gemini</p>
          </div>
          {isLoading && (
            <span className="ml-auto text-xs text-primary-600 animate-pulse">
              Thinking...
            </span>
          )}
        </div>

        {/* Context Indicator */}
        {contextUsed.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs text-slate-400">Using:</span>
            {contextUsed.map((ctx) => (
              <span
                key={ctx}
                className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded"
              >
                {ctx}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin"
        role="list"
        aria-label="Conversation messages"
      >
        {/* Welcome Message */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <span className="text-5xl mb-4" aria-hidden="true">🌱</span>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              Hi! I&apos;m your ACIA Assistant
            </h4>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              I can help you understand your carbon footprint, suggest personalized
              actions, and answer sustainability questions using your actual profile data.
            </p>

            {/* Suggested Questions */}
            <div className="w-full max-w-md">
              <p className="text-xs text-slate-400 mb-2">Try asking:</p>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSuggestedQuestion(question)}
                    disabled={isLoading}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors duration-150 disabled:opacity-50"
                  >
                    💬 {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((message, index) => (
          <MessageBubble
            key={`${message.role}-${index}`}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}

        {/* Loading Bubble */}
        {isLoading && (
          <MessageBubble
            role="assistant"
            content=""
            timestamp={new Date().toISOString()}
            isStreaming
          />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Status Announcer for screen readers */}
      <div aria-live="polite" className="sr-only">
        {isLoading ? 'Assistant is thinking...' : ''}
      </div>

      {/* Input Area */}
      <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <label htmlFor="chat-input" className="sr-only">
              Message to AI assistant
            </label>
            <textarea
              ref={inputRef}
              id="chat-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your carbon footprint..."
              disabled={isLoading}
              rows={1}
              className="input-base resize-none pr-16 min-h-[42px] max-h-[120px]"
              style={{
                height: `${Math.min(120, Math.max(42, input.split('\n').length * 24 + 18))}px`,
              }}
              aria-invalid={!!error}
              aria-describedby={error ? 'chat-input-error' : undefined}
            />
            {/* Character counter */}
            <span className={`absolute right-3 bottom-2 text-xs ${
              input.length > 900 ? 'text-red-400' : 'text-slate-300'
            }`}>
              {input.length}/1000
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="btn-primary px-4 self-end"
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {error && (
          <p id="chat-input-error" className="error-text mt-1" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-slate-300 mt-2">
          Press Enter to send. Shift+Enter for new line.
        </p>
      </div>
    </div>
  )
}