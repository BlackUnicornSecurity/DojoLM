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
}

export function ChatBubble({ role, content, timestamp, isCode }: ChatBubbleProps) {
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
            "text-[10px] mt-1 block",
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
    </div>
  )
}
