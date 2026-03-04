/**
 * File: error-boundary.test.tsx
 * Purpose: Tests for ErrorBoundary component
 * Story: TPI-UIP-09
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, ErrorFallback } from '@/components/ui/ErrorBoundary'

// Component that throws on render
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error for boundary')
  }
  return <div data-testid="child-content">Working content</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByTestId('child-content')).toBeTruthy()
  })

  it('renders fallback UI when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy()
    expect(screen.getByText('Try Again')).toBeTruthy()
    spy.mockRestore()
  })

  it('renders custom fallback title and description', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary fallbackTitle="Scanner Error" fallbackDescription="Unable to scan.">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Scanner Error')).toBeTruthy()
    expect(screen.getByText('Unable to scan.')).toBeTruthy()
    spy.mockRestore()
  })

  it('does NOT expose server error details in UI', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    // The actual error message should NOT appear in the rendered output
    expect(screen.queryByText('Test error for boundary')).toBeNull()
    spy.mockRestore()
  })

  it('renders Try Again button in fallback for recovery', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    // Verify the retry button exists for user interaction
    const retryButton = screen.getByText('Try Again')
    expect(retryButton).toBeTruthy()
    expect(retryButton.tagName).toBe('BUTTON')
    spy.mockRestore()
  })
})

describe('ErrorFallback', () => {
  it('renders title and description', () => {
    render(<ErrorFallback title="Test Error" description="Something broke." />)
    expect(screen.getByText('Test Error')).toBeTruthy()
    expect(screen.getByText('Something broke.')).toBeTruthy()
  })

  it('renders retry button when onRetry provided', () => {
    const onRetry = vi.fn()
    render(<ErrorFallback title="Error" description="Desc" onRetry={onRetry} />)
    fireEvent.click(screen.getByText('Try Again'))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('hides retry button when onRetry not provided', () => {
    render(<ErrorFallback title="Error" description="Desc" />)
    expect(screen.queryByText('Try Again')).toBeNull()
  })
})
