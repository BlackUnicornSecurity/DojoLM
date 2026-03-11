'use client'

/**
 * File: error.tsx
 * Purpose: Custom error boundary page matching dark theme (ERR-001)
 */

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // R3-003: Only log digest in production to avoid leaking internal paths/stack traces
    if (process.env.NODE_ENV === 'production') {
      console.error('Application error:', error.digest ?? 'unknown')
    } else {
      console.error('Application error:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-7xl font-bold text-[var(--dojo-primary,#CC3A2F)]">500</div>
        <h1 className="text-2xl font-semibold text-[var(--foreground,#fafafa)]">
          Something went wrong
        </h1>
        <p className="text-[var(--text-secondary,#a1a1aa)]">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--dojo-primary,#CC3A2F)] text-white font-medium hover:opacity-90 motion-safe:transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
