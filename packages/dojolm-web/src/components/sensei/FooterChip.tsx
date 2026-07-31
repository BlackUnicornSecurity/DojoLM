// SPDX-License-Identifier: Apache-2.0
/**
 * File: FooterChip.tsx
 * Purpose: Cost / latency footer rendered beneath each assistant chat bubble.
 * Story: E4.S5 — retires F-7-016, F-7-017, F-7-021, F-7-024, F-7-025.
 *
 * Acceptance: every assistant bubble shows
 *   <FooterChip durationMs tokens model />
 * which renders text like "qwen3-coder:30b · 1.4s · 245 tokens".
 *
 * Index:
 * - FooterChipProps (line ~22)
 * - formatDuration (line ~32)
 * - formatTokens (line ~40)
 * - FooterChip component (line ~52)
 */

'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FooterChipProps {
  readonly durationMs: number
  readonly tokens: number
  readonly model: string
  readonly className?: string
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** "1234ms" -> "1.2s"; sub-second values render with one decimal of precision. */
function formatDuration(durationMs: number): string {
  const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0
  const seconds = ms / 1000
  return `${seconds.toFixed(1)}s`
}

/** Pluralise the token count and clamp to non-negative whole numbers. */
function formatTokens(tokens: number): string {
  const safe = Number.isFinite(tokens) && tokens > 0 ? Math.round(tokens) : 0
  return `${safe} tokens`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FooterChip({ durationMs, tokens, model, className }: FooterChipProps) {
  // Always render the footer even when tokens are 0 — visibility of the
  // metric (per F-7-021 cost-not-visible) is the whole point of this chip.
  const label = `${model} · ${formatDuration(durationMs)} · ${formatTokens(tokens)}`

  return (
    <p
      data-testid="sensei-footer-chip"
      role="note"
      aria-label={`Response footer: ${label}`}
      className={cn(
        'mt-1 px-1 text-xs italic text-[var(--text-tertiary)]',
        'select-text',
        className,
      )}
    >
      {label}
    </p>
  )
}
