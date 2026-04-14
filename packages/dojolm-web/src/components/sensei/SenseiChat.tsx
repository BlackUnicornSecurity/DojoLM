/**
 * File: SenseiChat.tsx
 * Purpose: Chat interface for Sensei — messages, input, typing indicator, empty state
 * Story: SH6.3
 * Index:
 * - SenseiChatProps (line 16)
 * - SenseiChat component (line 27)
 * - ConfirmationCard component (line 126)
 * - TypingIndicator component (line 162)
 */

'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'
import { ChatBubble } from '@/components/llm/ChatBubble'
import { SenseiToolResultCard } from './SenseiToolResult'
import { SenseiSuggestions } from './SenseiSuggestions'
import type { SenseiMessage, SenseiToolCall } from '@/lib/sensei'
import type { NavId } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SenseiChatProps {
  readonly messages: readonly SenseiMessage[]
  readonly isLoading: boolean
  readonly activeModule: NavId
  readonly pendingConfirmations: readonly SenseiToolCall[]
  readonly onSend: (text: string) => void
  readonly onConfirm: (callId: string) => void
  readonly onReject: (callId: string) => void
  readonly onNavigate?: (module: NavId) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SenseiChat({
  messages,
  isLoading,
  activeModule,
  pendingConfirmations,
  onSend,
  onConfirm,
  onReject,
  onNavigate,
}: SenseiChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState('')

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || isLoading) return
    setInputValue('')
    onSend(text)
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }, [inputValue, isLoading, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // Auto-grow textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        role="log"
        aria-label="Sensei conversation"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-lg font-semibold text-[var(--foreground)] mb-1">
              Welcome to Sensei
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              Your AI security assistant. Ask anything about the platform or let me run tools for you.
            </p>
            <SenseiSuggestions activeModule={activeModule} onSend={onSend} />
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id}>
                {(msg.role === 'user' || msg.role === 'assistant') && (
                  <ChatBubble role={msg.role} content={msg.content} />
                )}
                {/* Render tool results inline */}
                {msg.toolResults?.map((result) => (
                  <SenseiToolResultCard
                    key={result.toolCallId}
                    tool={result.tool}
                    success={result.success}
                    data={result.data}
                    error={result.error}
                    durationMs={result.durationMs}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ))}

            {/* Pending confirmations */}
            {pendingConfirmations.map((call) => (
              <ConfirmationCard
                key={call.id}
                call={call}
                onConfirm={onConfirm}
                onReject={onReject}
              />
            ))}

            {/* Typing indicator */}
            {isLoading && <TypingIndicator />}

            {/* Post-response suggestions */}
            {!isLoading && messages.length > 0 && (
              <SenseiSuggestions activeModule={activeModule} onSend={onSend} />
            )}
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--border)] px-3 py-2 bg-[var(--bg-secondary)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask Sensei..."
            disabled={isLoading}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-lg px-3 py-2 text-sm',
              'bg-[var(--bg-tertiary)] text-[var(--foreground)] border border-[var(--border-subtle)]',
              'placeholder:text-[var(--text-tertiary)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label="Message input"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg',
              'bg-[var(--primary)] text-white',
              'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'motion-safe:transition-opacity',
            )}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirmation Card
// ---------------------------------------------------------------------------

interface ConfirmationCardProps {
  readonly call: SenseiToolCall
  readonly onConfirm: (callId: string) => void
  readonly onReject: (callId: string) => void
}

function ConfirmationCard({ call, onConfirm, onReject }: ConfirmationCardProps) {
  const toolName = call.tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const argsSummary = Object.entries(call.args)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 50)}`)
    .join(', ')

  return (
    <div className="my-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm" role="alert">
      <p className="font-medium text-amber-400 mb-1">
        Confirmation required: {toolName}
      </p>
      {argsSummary && (
        <p className="text-xs text-[var(--text-tertiary)] mb-2 truncate">{argsSummary}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(call.id)}
          className="px-3 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={() => onReject(call.id)}
          className="px-3 py-1 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-quaternary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Typing Indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2 max-w-[85%]" aria-label="Sensei is typing" role="status">
      <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] motion-safe:animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] motion-safe:animate-pulse" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] motion-safe:animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  )
}
