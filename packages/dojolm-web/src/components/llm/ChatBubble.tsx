// SPDX-License-Identifier: Apache-2.0
/**
 * File: ChatBubble.tsx
 * Purpose: Chat-style message bubbles for LLM prompts and responses
 * Story: TPI-UI-001-22
 * Index:
 * - ChatBubbleProps interface (line 14)
 * - ChatBubble component (line 22)
 */

'use client'

import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  isCode?: boolean
  /**
   * Wave 3ff (F-7-018 P1 retire) — Optional cost/latency metadata
   * surfaced as a small italic footer beneath the assistant bubble.
   * Mirrors the SenseiChat → FooterChip pattern so non-Sensei chat
   * surfaces (LLM-gated workbench, agentic scenario chat) can render
   * the same affordance without depending on the Sensei message
   * structure. Renders only when `role === 'assistant'` AND at least
   * one of `durationMs` / `tokens` / `model` is provided.
   */
  durationMs?: number
  tokens?: number
  model?: string
}

/**
 * Wave 3ff (F-7-018 P1 retire) — Helpers shared with FooterChip. We
 * intentionally inline them rather than import so ChatBubble stays
 * dependency-free (FooterChip lives under `components/sensei` which is
 * a feature module; the base ChatBubble is consumed by both Sensei and
 * non-Sensei flows).
 */
function formatBubbleDuration(durationMs: number | undefined): string | null {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) {
    return null
  }
  const seconds = durationMs / 1000
  return `${seconds.toFixed(1)}s`
}

function formatBubbleTokens(tokens: number | undefined): string | null {
  if (typeof tokens !== 'number' || !Number.isFinite(tokens) || tokens <= 0) {
    return null
  }
  return `${Math.round(tokens)} tokens`
}

export function ChatBubble({
  role,
  content,
  timestamp,
  isCode,
  durationMs,
  tokens,
  model,
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUser = role === 'user'

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      /* clipboard not available (non-HTTPS or permission denied) */
    })
  }

  return (
    <div
      role="listitem"
      aria-label={isUser ? 'Your message' : 'Assistant message'}
      className={cn("flex gap-3 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
    >
      <div className={cn(
        "rounded-lg px-4 py-3 relative group",
        isUser
          ? "bg-[var(--primary)] text-white rounded-br-sm"
          : "bg-[var(--bg-tertiary)] text-[var(--foreground)] border border-[var(--border)] rounded-bl-sm"
      )}>
        {isCode ? (
          <pre className="text-xs font-mono whitespace-pre-wrap break-words m-0">
            <code>{content}</code>
          </pre>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        )}
        {timestamp && (
          <span className={cn(
            "text-xs mt-1 block",
            isUser ? "text-white/60" : "text-[var(--text-tertiary)]"
          )}>
            {timestamp}
          </span>
        )}
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-sm transition-opacity text-[var(--text-tertiary)] hover:text-[var(--foreground)]"
            aria-label={copied ? 'Copied' : 'Copy to clipboard'}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {!isUser && (
        (() => {
          // Wave 3ff (F-7-018 P1 retire) — Footer with cost/latency.
          // Renders only when the assistant bubble has at least one
          // metadata field. The label format intentionally matches
          // SenseiChat's FooterChip ("{model} · {duration} · {tokens}")
          // so the visual feels consistent across Sensei + non-Sensei
          // chat surfaces (workbench, agentic). Hidden when the
          // assistant bubble is still streaming (no fields provided).
          const durationLabel = formatBubbleDuration(durationMs)
          const tokensLabel = formatBubbleTokens(tokens)
          const modelLabel = typeof model === 'string' && model.length > 0 ? model : null
          const parts = [modelLabel, durationLabel, tokensLabel].filter(
            (p): p is string => typeof p === 'string'
          )
          if (parts.length === 0) return null
          const label = parts.join(' · ')
          return (
            <p
              data-testid="chat-bubble-footer-chip"
              role="note"
              aria-label={`Response footer: ${label}`}
              className={cn(
                'mt-1 px-1 text-xs italic text-[var(--text-tertiary)]',
                'select-text',
              )}
            >
              {label}
            </p>
          )
        })()
      )}
    </div>
  )
}
