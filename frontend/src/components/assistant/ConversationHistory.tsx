/**
 * ConversationHistory Component
 *
 * Displays a list of previous conversation sessions
 * in the sidebar. Each session shows a preview of
 * the first message and the session date.
 *
 * Users can start a new conversation or continue
 * a previous one.
 */

import { formatRelativeTime } from '../../utils/formatters'
import type { ConversationSession } from '../../types/api.types'

interface ConversationHistoryProps {
  sessions: ConversationSession[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewConversation: () => void
  isLoading: boolean
}

export default function ConversationHistory({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewConversation,
  isLoading,
}: ConversationHistoryProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full">
      {/* New Conversation Button */}
      <button
        onClick={onNewConversation}
        className="w-full btn-primary py-2.5 mb-4 text-sm"
      >
        + New Conversation
      </button>

      {/* Session List */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-400 px-2 mb-2">Recent Conversations</p>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">
            No previous conversations
          </p>
        )}

        {!isLoading && sessions.map((session) => {
          const isActive = session.session_id === activeSessionId
          const firstUserMessage = session.messages.find((m) => m.role === 'user')
          const preview = firstUserMessage
            ? firstUserMessage.content.slice(0, 60)
            : 'New conversation'

          return (
            <button
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'bg-primary-50 border border-primary-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <p className={`text-sm truncate ${
                isActive ? 'text-primary-700 font-medium' : 'text-slate-700'
              }`}>
                {preview}{preview.length >= 60 ? '...' : ''}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatRelativeTime(session.updated_at)}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}