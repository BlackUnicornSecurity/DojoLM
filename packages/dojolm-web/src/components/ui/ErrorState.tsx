// SPDX-License-Identifier: Apache-2.0
/**
 * File: ErrorState.tsx
 * Purpose: Shared error-state UI — sanitized message, optional retry, three variants.
 * Story: P1-1 / P1-2 (MASTER-QA error-state UX policy).
 *
 * Yamabushi audit pass 7 (2026-04-25): ported off shadcn Button/Card +
 * Tailwind colour utilities onto design-system tokens (`var(--torii-rgb)`
 * / `var(--fg)` / `var(--fg-mute)` / `--b-red`) + `.btn` primitive. The
 * shadcn-derived `--danger` token was a duplicate alias for torii red;
 * inlined as `var(--torii)` per plan §5 single-accent guardrail.
 *
 * Variants:
 * - 'card'   (default) — bordered red-tinted card, use inside panels
 * - 'inline' — compact red-tinted banner, use next to a form field/row
 * - 'page'   — full-height centered layout, use for route-level errors
 */

'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react'

function sanitizeError(err: unknown): string | null {
  if (err === null || err === undefined) return null

  const truncate = (s: string) => (s.length > 200 ? `${s.slice(0, 197)}...` : s)

  if (err instanceof Error) {
    return truncate(err.message || 'An unexpected error occurred.')
  }

  if (typeof err === 'string') {
    return truncate(err)
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (typeof obj.error === 'string') return truncate(obj.error)
    if (typeof obj.message === 'string') return truncate(obj.message)
  }

  return 'An unexpected error occurred.'
}

interface ErrorStateProps {
  title?: string
  message?: string
  error?: unknown
  icon?: LucideIcon
  onRetry?: () => void
  retryLabel?: string
  className?: string
  variant?: 'inline' | 'card' | 'page'
}

export function ErrorState({
  title = 'Unable to load',
  message,
  error,
  icon: Icon = AlertTriangle,
  onRetry,
  retryLabel = 'Retry',
  className,
  variant = 'card',
}: ErrorStateProps) {
  const sanitized = sanitizeError(error)

  const body = (
    <div
      className={cn(
        'flex items-start gap-3 text-left',
        variant === 'page' && 'flex-col items-center text-center max-w-md',
      )}
    >
      <Icon
        className={cn('shrink-0', variant === 'page' ? 'h-10 w-10' : 'h-5 w-5 mt-0.5')}
        style={{ color: 'var(--torii-hi)' }}
        aria-hidden="true"
      />
      <div className={cn('flex-1 min-w-0', variant === 'page' && 'flex flex-col items-center')}>
        <p
          className={cn(
            'font-semibold',
            variant === 'page' ? 'text-lg' : 'text-sm',
          )}
          style={{ color: 'var(--fg)' }}
        >
          {title}
        </p>
        {message && (
          <p
            className={cn('mt-1', variant === 'page' ? 'text-sm' : 'text-xs')}
            style={{ color: 'var(--fg-mute)' }}
          >
            {message}
          </p>
        )}
        {sanitized && (
          <p
            className={cn('mt-1 break-words', variant === 'page' ? 'text-xs' : 'text-xs')}
            style={{ color: 'var(--fg-ghost)' }}
          >
            {sanitized}
          </p>
        )}
        {onRetry && (
          <div className={cn('mt-3', variant === 'page' && 'flex justify-center')}>
            <button
              type="button"
              className="btn sm"
              onClick={onRetry}
              aria-label={`Error state retry action: ${retryLabel}`}
              style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {retryLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={cn('rounded-lg p-3', className)}
        style={{
          border: '1px solid var(--b-red)',
          background: 'rgba(var(--torii-rgb), 0.10)',
        }}
      >
        {body}
      </div>
    )
  }

  if (variant === 'page') {
    return (
      <div
        role="alert"
        className={cn('flex min-h-[60vh] w-full items-center justify-center p-6', className)}
      >
        {body}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={cn('panel', className)}
      style={{
        borderColor: 'var(--b-red)',
        background: 'rgba(var(--torii-rgb), 0.05)',
        padding: 16,
      }}
    >
      {body}
    </div>
  )
}
