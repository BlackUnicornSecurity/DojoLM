// SPDX-License-Identifier: Apache-2.0
/**
 * File: ErrorBoundary.tsx
 * Purpose: React Error Boundary with EmptyState error fallback UI
 * Story: TPI-UIP-09
 * Index:
 * - ErrorBoundary class component (line 15)
 * - ErrorFallback presentational component (line 55)
 */

'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertOctagon } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
  fallbackDescription?: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Intentional: error diagnostics for development/debugging — MUST NOT expose details to UI
    console.error('ErrorBoundary caught:', error.message, errorInfo.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          title={this.props.fallbackTitle ?? 'Something went wrong'}
          description={this.props.fallbackDescription ?? 'An unexpected error occurred. Please try again.'}
          onRetry={this.handleRetry}
        />
      )
    }
    return this.props.children
  }
}

interface ErrorFallbackProps {
  title: string
  description: string
  onRetry?: () => void
}

export function ErrorFallback({ title, description, onRetry }: ErrorFallbackProps) {
  // Design-system primitives only (Yamabushi audit pass 2026-04-25):
  // tokens (--torii / --fg / --fg-mute) + .btn — no shadcn Button, no
  // Tailwind colour utilities. Tailwind layout utilities are kept where
  // they bridge spacing only (py-16 / px-4 / etc) per plan §5 guardrail.
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '64px 16px',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: 'rgba(var(--torii-rgb), 0.1)',
          border: '1px solid var(--b-red)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 16,
        }}
      >
        <AlertOctagon className="w-8 h-8" style={{ color: 'var(--torii-hi)' }} aria-hidden="true" />
      </div>
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </h3>
      <p style={{ margin: '0 0 24px', maxWidth: '32rem', color: 'var(--fg-mute)', fontSize: 13 }}>
        {description}
      </p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  )
}
