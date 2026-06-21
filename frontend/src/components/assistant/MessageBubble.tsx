/**
 * MessageBubble Component
 *
 * Renders a single message in the AI assistant conversation.
 * User messages appear on the right with primary color.
 * Assistant messages appear on the left with neutral color.
 *
 * Accessibility:
 * - role="listitem" for screen reader navigation
 * - Timestamp included for context
 * - Text is selectable for copying
 */

import { formatRelativeTime } from '../../utils/formatters'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      role="listitem"
    >
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar and Name */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && (
            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs" aria-hidden="true">🤖</span>
            </div>
          )}
          <span className="text-xs text-slate-400">
            {isUser ? 'You' : 'ACIA Assistant'}
          </span>
          <span className="text-xs text-slate-300">
            {formatRelativeTime(timestamp)}
          </span>
        </div>

        {/* Message Content */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
          }`}
        >
          {content.split('\n').map((line, index) => (
            <p key={index} className={index > 0 ? 'mt-2' : ''}>
              {line}
            </p>
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <span className="inline-flex gap-1 ml-1 items-center">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}