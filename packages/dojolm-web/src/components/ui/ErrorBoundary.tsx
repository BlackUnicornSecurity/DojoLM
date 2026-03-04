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
import { Button } from './button'

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
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertOctagon className="w-8 h-8 text-red-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  )
}
