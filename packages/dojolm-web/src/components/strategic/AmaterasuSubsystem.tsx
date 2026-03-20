/**
 * File: AmaterasuSubsystem.tsx
 * Purpose: Thin wrapper that dynamically imports AttackDNAExplorer for embedding in The Kumite
 * Story: DAITENGUYAMA M3.2
 * Index:
 * - LoadingSkeleton (line 12)
 * - ErrorFallback (line 25)
 * - AmaterasuErrorBoundary class (line 37)
 * - AmaterasuSubsystem component (line 62)
 */

'use client'

import { Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle } from 'lucide-react'

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Loading Amaterasu DNA">
      <div className="h-8 w-48 bg-[var(--bg-quaternary)] rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-[var(--bg-quaternary)] rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-[var(--bg-quaternary)] rounded-lg" />
    </div>
  )
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-[var(--status-deny)]" aria-hidden="true" />
      <p className="text-sm font-medium">Failed to load Amaterasu DNA</p>
      <p className="text-xs text-muted-foreground">The module could not be loaded. Please try again.</p>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

interface ErrorBoundaryState { hasError: boolean }

class AmaterasuErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}

const AttackDNAExplorer = dynamic(
  () => import('../attackdna/AttackDNAExplorer').then(mod => ({ default: mod.AttackDNAExplorer })),
  { ssr: false, loading: () => <LoadingSkeleton /> }
)

export function AmaterasuSubsystem() {
  return (
    <AmaterasuErrorBoundary>
      <AttackDNAExplorer embedded />
    </AmaterasuErrorBoundary>
  )
}
