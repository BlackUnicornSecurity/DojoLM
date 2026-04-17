/**
 * File: error-state.tsx
 * Purpose: Shared error-state UI component — sanitized message, optional retry, three variants
 * Story: P1-1 / P1-2 (MASTER-QA error-state UX policy)
 * Index:
 * - sanitizeError helper (line 34)
 * - ErrorStateProps interface (line 71)
 * - ErrorState component (line 96)
 *
 * Usage:
 *   <ErrorState
 *     title="Unable to load campaigns"
 *     message="Check your connection and try again."
 *     error={err}
 *     onRetry={refetch}
 *   />
 *
 * Variants:
 * - 'card'   (default) — wraps content in a Card with border/padding, use inside panels
 * - 'inline' — compact inline error (toast-like banner), use next to a form field or row
 * - 'page'   — full-page centered layout, use for route-level errors
 */

'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/**
 * Safely convert an unknown error value to a user-friendly string.
 *
 * Rules:
 * - `Error` instance → use `.message` (truncated to 200 chars)
 * - `string`         → truncate to 200 chars
 * - object with `.error` field (e.g. API JSON) → use that field
 * - object with `.message` field → use that field
 * - anything else → generic fallback
 *
 * Never leaks raw JSON or stack traces.
 */
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  /** Short header, e.g. "Unable to load campaigns". Defaults to "Unable to load". */
  title?: string
  /** User-friendly guidance, e.g. "Check your connection and try again." */
  message?: string
  /**
   * Raw error value from a catch / state. Sanitized before display.
   * Accepts Error, string, or object with `.error`/`.message` field.
   * Never displays raw JSON or stack traces.
   */
  error?: unknown
  /** Icon override (default: AlertTriangle from lucide-react). */
  icon?: LucideIcon
  /** When provided, renders a "Retry" button that calls this. */
  onRetry?: () => void
  /** Override the retry button label. Default "Retry". */
  retryLabel?: string
  className?: string
  /**
   * Visual variant.
   * - 'card'   (default): wraps in a Card, good for panel content
   * - 'inline': compact banner, good inside a form or row
   * - 'page'  : full-height centered layout for route-level errors
   */
  variant?: 'inline' | 'card' | 'page'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shared error-state UI. Use this instead of ad-hoc red text / raw JSON.
 *
 * @example
 * <ErrorState
 *   title="Unable to load models"
 *   message="We couldn't reach the model endpoint."
 *   error={err}
 *   onRetry={refetch}
 * />
 */
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
        className={cn(
          'shrink-0 text-[var(--danger)]',
          variant === 'page' ? 'h-10 w-10' : 'h-5 w-5 mt-0.5',
        )}
        aria-hidden="true"
      />
      <div className={cn('flex-1 min-w-0', variant === 'page' && 'flex flex-col items-center')}>
        <p className={cn('font-semibold text-[var(--foreground)]', variant === 'page' ? 'text-lg' : 'text-sm')}>
          {title}
        </p>
        {message && (
          <p className={cn('mt-1 text-muted-foreground', variant === 'page' ? 'text-sm' : 'text-xs')}>
            {message}
          </p>
        )}
        {sanitized && (
          <p
            className={cn(
              'mt-1 break-words text-muted-foreground/80',
              variant === 'page' ? 'text-xs' : 'text-xs',
            )}
          >
            {sanitized}
          </p>
        )}
        {onRetry && (
          <div className={cn('mt-3', variant === 'page' && 'flex justify-center')}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={cn(
          'rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3',
          className,
        )}
      >
        {body}
      </div>
    )
  }

  if (variant === 'page') {
    return (
      <div
        role="alert"
        className={cn(
          'flex min-h-[60vh] w-full items-center justify-center p-6',
          className,
        )}
      >
        {body}
      </div>
    )
  }

  // 'card' (default)
  return (
    <Card
      role="alert"
      className={cn('border-[var(--danger)]/30 bg-[var(--danger)]/5', className)}
    >
      <CardContent className="p-4">{body}</CardContent>
    </Card>
  )
}
