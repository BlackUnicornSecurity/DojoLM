/**
 * File: fuzzer-panel.test.tsx
 * Purpose: Unit tests for FuzzerPanel component
 * Test IDs: FZP-001 to FZP-007
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Shuffle: (props: Record<string, unknown>) => <svg data-testid="shuffle-icon" {...props} />,
  Play: (props: Record<string, unknown>) => <svg data-testid="play-icon" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  Zap: (props: Record<string, unknown>) => <svg data-testid="zap-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: ReactNode; [k: string]: unknown }) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: { children: ReactNode; onClick?: () => void; disabled?: boolean; [k: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span data-testid="badge">{children}</span>,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string; icon: unknown }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { FuzzerPanel } from '../buki/FuzzerPanel'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FuzzerPanel (FZP-001 to FZP-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  it('FZP-001: renders Fuzz Configuration heading', () => {
    render(<FuzzerPanel />)
    expect(screen.getByText('Fuzz Configuration')).toBeInTheDocument()
  })

  it('FZP-002: renders three grammar options', () => {
    render(<FuzzerPanel />)
    expect(screen.getByText('Prompt Injection')).toBeInTheDocument()
    expect(screen.getByText('Encoding Bypass')).toBeInTheDocument()
    expect(screen.getByText('Structural Mutation')).toBeInTheDocument()
  })

  it('FZP-003: renders Start Fuzz Session button', () => {
    render(<FuzzerPanel />)
    const btn = screen.getAllByTestId('button').find((b) => b.textContent?.includes('Start Fuzz Session'))
    expect(btn).toBeInTheDocument()
  })

  it('FZP-004: renders empty state before any run', () => {
    render(<FuzzerPanel />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No fuzz results yet')).toBeInTheDocument()
  })

  it('FZP-005: renders mutation count range input', () => {
    render(<FuzzerPanel />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveAttribute('min', '10')
    expect(slider).toHaveAttribute('max', '200')
  })

  it('FZP-006: shows error message when API call fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    render(<FuzzerPanel />)
    const btn = screen.getAllByTestId('button').find((b) => b.textContent?.includes('Start Fuzz Session'))!
    fireEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    })
  })

  it('FZP-007: ignores malformed API response — missing results array', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ /* no results key */ }),
    } as Response)

    render(<FuzzerPanel />)
    const btn = screen.getAllByTestId('button').find((b) => b.textContent?.includes('Start Fuzz Session'))!
    fireEvent.click(btn)

    await waitFor(() => {
      // Should not crash, no results rendered but no error thrown
      expect(screen.queryByTestId('alert-icon')).not.toBeInTheDocument()
    })
    // results.length === 0 so empty state or no results card
    expect(screen.queryByText('Fuzz Results')).not.toBeInTheDocument()
  })
})
