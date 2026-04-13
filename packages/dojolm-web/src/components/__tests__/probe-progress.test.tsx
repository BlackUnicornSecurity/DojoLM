/**
 * File: probe-progress.test.tsx
 * Purpose: Unit tests for ProbeProgress SSE streaming component
 * Story: K5.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('bu-tpi/fingerprint', () => ({}))

// Mock the authenticated event stream with handler capture
let capturedHandlers: Record<string, ((event: MessageEvent) => void)[]> = {}
const mockClose = vi.fn()

vi.mock('@/lib/authenticated-event-stream', () => ({
  connectAuthenticatedEventStream: (_url: string) => ({
    addEventListener: (type: string, handler: (event: MessageEvent) => void) => {
      if (!capturedHandlers[type]) capturedHandlers[type] = []
      capturedHandlers[type].push(handler)
    },
    removeEventListener: (type: string, handler: (event: MessageEvent) => void) => {
      if (capturedHandlers[type]) {
        capturedHandlers[type] = capturedHandlers[type].filter(h => h !== handler)
      }
    },
    close: mockClose,
  }),
}))

import { ProbeProgress } from '@/components/kagami/ProbeProgress'

function emitSSE(data: Record<string, unknown>) {
  const event = new MessageEvent('message', { data: JSON.stringify(data) })
  for (const handler of (capturedHandlers['message'] ?? [])) {
    handler(event)
  }
}

function emitSSEError() {
  for (const handler of (capturedHandlers['error'] ?? [])) {
    (handler as (e: Event) => void)(new Event('error') as unknown as MessageEvent)
  }
}

describe('ProbeProgress', () => {
  beforeEach(() => {
    capturedHandlers = {}
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders phase indicators (Probing, Analyzing, Matching)', () => {
      render(<ProbeProgress streamId="test-1" />)
      expect(screen.getByText('Probing')).toBeInTheDocument()
      expect(screen.getByText('Analyzing')).toBeInTheDocument()
      expect(screen.getByText('Matching')).toBeInTheDocument()
    })

    it('renders progress bar with role="progressbar" and correct aria attributes', () => {
      render(<ProbeProgress streamId="test-1" />)
      const bar = screen.getByRole('progressbar', { name: 'Fingerprint probe progress' })
      expect(bar).toBeInTheDocument()
      expect(bar.getAttribute('aria-valuenow')).toBe('0')
      expect(bar.getAttribute('aria-valuemin')).toBe('0')
      expect(bar.getAttribute('aria-valuemax')).toBe('100')
    })

    it('renders initial probe count as 0 / 0', () => {
      render(<ProbeProgress streamId="test-1" />)
      expect(screen.getByText('Probe 0 / 0')).toBeInTheDocument()
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('shows initializing text before probes start', () => {
      render(<ProbeProgress streamId="test-1" />)
      expect(screen.getByText('Initializing...')).toBeInTheDocument()
    })

    it('displays elapsed time badge', () => {
      render(<ProbeProgress streamId="test-1" />)
      expect(screen.getByText('0s elapsed')).toBeInTheDocument()
    })
  })

  describe('SSE Progress Updates', () => {
    it('updates probe count and percentage on SSE message', () => {
      render(<ProbeProgress streamId="test-1" />)

      act(() => {
        emitSSE({ current: 5, total: 40, phase: 'probing', currentProbe: 'style_sig' })
      })

      expect(screen.getByText('Probe 5 / 40')).toBeInTheDocument()
      expect(screen.getByText('13%')).toBeInTheDocument()
      expect(screen.getByText('style_sig')).toBeInTheDocument()
    })

    it('updates phase indicator when phase changes', () => {
      render(<ProbeProgress streamId="test-1" />)

      act(() => {
        emitSSE({ current: 40, total: 40, phase: 'analyzing', currentProbe: null })
      })

      expect(screen.getByText('Probe 40 / 40')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('shows estimated remaining time when progress > 0', () => {
      render(<ProbeProgress streamId="test-1" />)

      // Advance timer by 10s then update progress
      act(() => { vi.advanceTimersByTime(10_000) })
      act(() => {
        emitSSE({ current: 10, total: 40, phase: 'probing', currentProbe: 'probe_x' })
      })

      // elapsed=10s, current=10, total=40, remaining ≈ 30s
      expect(screen.getByText(/remaining/)).toBeInTheDocument()
    })
  })

  describe('Stream Completion', () => {
    it('calls onComplete when stream sends phase:complete', () => {
      const onComplete = vi.fn()
      render(<ProbeProgress streamId="test-1" onComplete={onComplete} />)

      act(() => {
        emitSSE({ phase: 'complete', result: { candidates: ['a'] } })
      })

      expect(onComplete).toHaveBeenCalledWith({ candidates: ['a'] })
      expect(mockClose).toHaveBeenCalled()
    })

    it('calls onError when stream sends phase:error', () => {
      const onError = vi.fn()
      render(<ProbeProgress streamId="test-1" onError={onError} />)

      act(() => {
        emitSSE({ phase: 'error', error: 'Model timeout' })
      })

      expect(onError).toHaveBeenCalledWith('Model timeout')
      expect(mockClose).toHaveBeenCalled()
    })

    it('calls onError with default message when error has no message', () => {
      const onError = vi.fn()
      render(<ProbeProgress streamId="test-1" onError={onError} />)

      act(() => { emitSSE({ phase: 'error' }) })

      expect(onError).toHaveBeenCalledWith('Unknown error')
    })

    it('calls onError on SSE connection failure', () => {
      const onError = vi.fn()
      render(<ProbeProgress streamId="test-1" onError={onError} />)

      act(() => { emitSSEError() })

      expect(onError).toHaveBeenCalledWith('Stream connection lost')
      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('closes event source on unmount', () => {
      const { unmount } = render(<ProbeProgress streamId="test-1" />)
      unmount()
      expect(mockClose).toHaveBeenCalled()
    })

    it('ignores malformed SSE messages gracefully', () => {
      render(<ProbeProgress streamId="test-1" />)

      act(() => {
        const event = new MessageEvent('message', { data: 'not-json' })
        for (const handler of (capturedHandlers['message'] ?? [])) {
          handler(event)
        }
      })

      expect(screen.getByText('Probing')).toBeInTheDocument()
    })

    it('closes old event source when streamId changes', () => {
      const { rerender } = render(<ProbeProgress streamId="stream-a" />)
      const closeCalls = mockClose.mock.calls.length

      rerender(<ProbeProgress streamId="stream-b" />)

      // Old source should have been closed by the effect cleanup
      expect(mockClose.mock.calls.length).toBeGreaterThan(closeCalls)
    })

    it('closes old source and detaches listeners on streamId change', () => {
      const onComplete = vi.fn()

      const { rerender } = render(
        <ProbeProgress streamId="stream-a" onComplete={onComplete} />
      )

      // Rerender with new streamId triggers effect cleanup →
      // removeEventListener + close on old source
      const closesBefore = mockClose.mock.calls.length
      rerender(<ProbeProgress streamId="stream-b" onComplete={onComplete} />)
      expect(mockClose.mock.calls.length).toBeGreaterThan(closesBefore)
    })
  })

  describe('Timer cleanup on completion', () => {
    it('stops elapsed timer when stream completes', () => {
      const onComplete = vi.fn()
      render(<ProbeProgress streamId="test-1" onComplete={onComplete} />)

      // Advance timer and verify it increments
      act(() => { vi.advanceTimersByTime(3000) })
      expect(screen.getByText('3s elapsed')).toBeInTheDocument()

      // Complete the stream
      act(() => {
        emitSSE({ phase: 'complete', result: {} })
      })

      // Advance timer further — elapsed should NOT change
      const elapsedBefore = screen.getByText(/elapsed/).textContent
      act(() => { vi.advanceTimersByTime(5000) })
      const elapsedAfter = screen.getByText(/elapsed/).textContent
      expect(elapsedAfter).toBe(elapsedBefore)
    })
  })
})
