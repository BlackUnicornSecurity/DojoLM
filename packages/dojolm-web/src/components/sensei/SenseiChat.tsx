// SPDX-License-Identifier: Apache-2.0
/**
 * File: SenseiChat.tsx
 * Purpose: Chat interface for Sensei — messages, input, typing indicator, empty state
 * Story: SH6.3, E4.S1 (Stop button), E4.S5 (FooterChip), E4.S7 (Regenerate button), E4.S8 (aria-live streaming region)
 * Index:
 * - SenseiChatProps (line 16)
 * - SenseiChat component (line 27)
 * - ConfirmationCard component
 * - TypingIndicator component
 */

'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { Send, Square, RotateCw } from 'lucide-react'
import { ChatBubble } from '@/components/llm/ChatBubble'
import { SenseiToolResultCard } from './SenseiToolResult'
import { SenseiSuggestions } from './SenseiSuggestions'
import { FooterChip } from './FooterChip'
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
  /**
   * E4.S1 — when provided, a Stop button is rendered while `isLoading` is true.
   * Clicking it should abort the in-flight stream
   * (typically `useSensei.stopStreaming` / `abortRef.current?.abort()`).
   */
  readonly onStop?: () => void
  /**
   * E4.S1 — when true the chat surface renders a "Stopped" footer below the
   * partial assistant response. Set by `useSensei` once a stream has been
   * user-aborted; cleared on the next send.
   */
  readonly wasStopped?: boolean
  /**
   * E4.S7 — when provided, a "↻ Regenerate" button is rendered beneath each
   * assistant bubble (except the actively-streaming one). Clicking removes
   * the assistant message and re-sends the previous user message. Hidden
   * while `isLoading` is true so the user can't double-fire requests.
   */
  readonly onRegenerate?: (assistantMessageId: string) => void
  /**
   * E4.S9 — F-7-019 (P1) retire. When `true`, the empty-state branch
   * surfaces a "Pick a model first" precondition CTA before the user
   * tries to type, instead of silently dropping the first send and
   * surfacing the error post-keystroke. The CTA reuses the existing
   * model-picker focus mechanism (parent passes `onPickModel`).
   *
   * Resolution rule (per finding text): "doesn't surface missing-model
   * precondition until you try to type" → moving the affordance into
   * the empty branch satisfies Nielsen #5 (error prevention).
   */
  readonly isModelMissing?: boolean
  /**
   * E4.S9 — paired with `isModelMissing`. When the empty branch
   * renders the CTA, clicking it lifts focus to the model picker
   * upstream (SenseiDrawer focuses the picker input + opens the
   * listbox). Optional so other consumers can render the chat
   * without a picker (e.g. tests).
   */
  readonly onPickModel?: () => void
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
  onStop,
  wasStopped = false,
  onRegenerate,
  isModelMissing = false,
  onPickModel,
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
      {/*
        E4.S8 — `aria-live="polite"` + `aria-busy={isLoading}` lets
        assistive tech announce streamed assistant tokens as they
        arrive, and signals the streaming state. `role="log"` is
        retained from SH6.3 for the conversation semantics; the live
        region attributes layer cleanly on top.
      */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        role="log"
        aria-label="Sensei conversation"
        aria-live="polite"
        aria-busy={isLoading}
        data-testid="sensei-chat-log"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-lg font-semibold text-[var(--foreground)] mb-1">
              Welcome to Sensei
            </p>
            {/*
              E9.S9 (F-7-032 P3 retire): the previous welcome string
              was two sentences glued together (88 chars) — slightly
              long for a first-paint welcome. The replacement is a
              single sentence, ≤ 50 chars, that preserves the
              "AI security assistant" framing.
            */}
            <p
              className="text-sm text-[var(--text-tertiary)] mb-4"
              data-testid="sensei-welcome-copy"
            >
              Your AI security assistant — ask anything.
            </p>
            {/*
              E4.S9 — F-7-019 (P1) retire. Surface the missing-model
              precondition in the EMPTY branch (before the user
              types) so they're not silently dropped on first send.
              Nielsen #5 (Error Prevention) — the CTA hops focus to
              the model picker upstream so the next interaction is
              "pick a model" instead of "type and fail".
            */}
            {isModelMissing && (
              <div
                role="status"
                data-testid="sensei-model-missing-precondition"
                className="mb-3 px-3 py-2 rounded-md text-xs bg-amber-500/10 text-amber-400 border border-amber-500/40 max-w-sm"
              >
                <p className="font-medium mb-1">Pick a model first</p>
                <p className="mb-2">
                  Sensei can't answer without a target model selected.
                  Choose one above to start the conversation.
                </p>
                {onPickModel && (
                  <button
                    type="button"
                    onClick={onPickModel}
                    data-testid="sensei-model-missing-cta"
                    className={cn(
                      'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
                      'bg-amber-500/20 text-amber-300 border border-amber-500/40',
                      'hover:bg-amber-500/30 focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                      'motion-safe:transition-colors',
                    )}
                  >
                    Pick a model
                  </button>
                )}
              </div>
            )}
            <SenseiSuggestions activeModule={activeModule} onSend={onSend} />
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant'
              // E4.S7 — show Regenerate beneath every assistant bubble that is
              // not currently streaming. A message is "currently streaming"
              // when it is the last message AND the chat is loading.
              const isStreamingTail = isLoading && idx === messages.length - 1
              const showRegenerate =
                isAssistant &&
                !!onRegenerate &&
                !isLoading &&
                !isStreamingTail &&
                hasPriorUserMessage(messages, idx)
              return (
                <div key={msg.id}>
                  {(msg.role === 'user' || msg.role === 'assistant') && (
                    <ChatBubble role={msg.role} content={msg.content} />
                  )}
                  {/* E4.S5 — cost/latency footer beneath assistant bubbles. */}
                  {isAssistant && msg.footer && (
                    <FooterChip
                      durationMs={msg.footer.durationMs}
                      tokens={msg.footer.tokens}
                      model={msg.footer.model}
                    />
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
                  {showRegenerate && (
                    <div className="mr-auto max-w-[85%] mt-1 px-1">
                      <button
                        type="button"
                        onClick={() => onRegenerate?.(msg.id)}
                        data-testid="sensei-regenerate-button"
                        aria-label="Regenerate response"
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs',
                          'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
                          'hover:bg-[var(--bg-quaternary)] hover:text-[var(--foreground)]',
                          'focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                          'motion-safe:transition-colors',
                        )}
                      >
                        <RotateCw className="w-3 h-3" aria-hidden="true" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pending confirmations */}
            {pendingConfirmations.map((call) => (
              <ConfirmationCard
                key={call.id}
                call={call}
                onConfirm={onConfirm}
                onReject={onReject}
              />
            ))}

            {/* Typing indicator + E4.S1 Stop button row */}
            {isLoading && (
              <div className="flex items-center gap-2">
                <TypingIndicator />
                {onStop && (
                  <button
                    type="button"
                    onClick={onStop}
                    data-testid="sensei-stop-button"
                    aria-label="Stop generating"
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md text-xs',
                      'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
                      'hover:bg-[var(--bg-quaternary)] hover:text-[var(--foreground)]',
                      'focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                      'motion-safe:transition-colors',
                    )}
                  >
                    <Square className="w-3 h-3" aria-hidden="true" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            )}

            {/* E4.S1 — "Stopped" footer beneath the partial assistant response */}
            {!isLoading && wasStopped && (
              <p
                data-testid="sensei-stopped-footer"
                role="status"
                className="px-1 text-xs italic text-[var(--text-tertiary)]"
              >
                Stopped
              </p>
            )}

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
// E4.S7 — Regenerate helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the assistant message at `assistantIndex` has at least one
 * user message before it. The Regenerate button must not render for an
 * orphan assistant bubble (e.g., a system-seeded message with no prior
 * user prompt) — there would be nothing to re-send.
 */
function hasPriorUserMessage(
  messages: readonly SenseiMessage[],
  assistantIndex: number,
): boolean {
  for (let i = assistantIndex - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return true
  }
  return false
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

/**
 * E4.S10 (retires F-7-033 P3) — token-streaming cursor glyph.
 *
 * The previous indicator was the chat-app three-dot ellipsis (•••)
 * which signals HUMAN typing in iMessage / WhatsApp / Discord. The
 * finding called that "misleading" because the LLM is not typing at
 * a human cadence — it's streaming tokens. The replacement is a
 * blinking block-cursor (`▍`, U+258D — left five-eighths block) which
 * matches the IDE / shell convention for "machine producing
 * characters" and reads as LLM streaming rather than a human pause.
 *
 * Accessibility:
 *   - `role="status"` + `aria-label="Sensei is generating"` so AT
 *     announces the generating state without claiming the assistant
 *     is "typing" (the old aria-label was "Sensei is typing").
 *   - The cursor itself is `aria-hidden` so the screen reader
 *     announces only the role+label, not the literal block char.
 *   - `motion-safe:animate-pulse` keeps the blink under
 *     prefers-reduced-motion (CSS already handles that via the
 *     Tailwind variant).
 */
function TypingIndicator() {
  return (
    <div
      className="flex items-center px-4 py-2 max-w-[85%]"
      aria-label="Sensei is generating"
      role="status"
      data-testid="sensei-typing-indicator"
    >
      <span
        className="font-mono text-base text-[var(--text-secondary)] motion-safe:animate-pulse"
        aria-hidden="true"
        data-testid="sensei-token-cursor"
      >
        ▍
      </span>
    </div>
  )
}
