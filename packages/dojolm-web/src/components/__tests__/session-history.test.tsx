/**
 * File: session-history.test.tsx
 * Purpose: Tests for SessionHistory component — rendering, expand/collapse, review panel, delete
 * Story: P3.2 - Atemi Lab Session Recording
 * Index:
 * - TC-SESSH-001: returns null when no sessions
 * - TC-SESSH-002: renders session count badge
 * - TC-SESSH-003: collapsible header toggles session list
 * - TC-SESSH-004: session rows display name and event count
 * - TC-SESSH-005: clicking review opens review panel dialog
 * - TC-SESSH-006: review panel shows session config
 * - TC-SESSH-007: review panel shows severity summary
 * - TC-SESSH-008: review panel shows event log
 * - TC-SESSH-009: delete button removes session
 * - TC-SESSH-010: clear all removes all sessions
 * - TC-SESSH-011: Escape key closes review panel
 * - TC-SESSH-012: header has aria-expanded attribute
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { AtemiSession } from '@/lib/atemi-session-types'

const mockSessions: AtemiSession[] = [
  {
    id: 'sess-001',
    name: 'Test Session Alpha',
    status: 'completed',
    startedAt: '2026-03-01T10:00:00Z',
    endedAt: '2026-03-01T10:05:00Z',
    config: {
      targetModel: 'gpt-4',
      attackMode: 'basic',
      concurrency: 2,
      timeoutMs: 30000,
      autoLog: true,
    },
    events: [
      {
        id: 'evt-001',
        timestamp: '2026-03-01T10:01:00Z',
        type: 'attack_start',
        severity: 'high',
        message: 'Injection attack started',
      },
      {
        id: 'evt-002',
        timestamp: '2026-03-01T10:02:00Z',
        type: 'attack_result',
        severity: 'critical',
        message: 'System prompt leaked',
      },
    ],
    summary: {
      totalEvents: 2,
      bySeverity: { critical: 1, high: 1, medium: 0, low: 0 },
      durationMs: 300000,
      topTools: ['scanner', 'injector'],
    },
  },
  {
    id: 'sess-002',
    name: 'Test Session Beta',
    status: 'recording',
    startedAt: '2026-03-02T14:00:00Z',
    config: {
      targetModel: 'claude-3',
      attackMode: 'advanced',
      concurrency: 4,
      timeoutMs: 60000,
      autoLog: false,
    },
    events: [],
  },
]

// Mock the storage module
vi.mock('@/lib/atemi-session-storage', () => ({
  loadSessions: vi.fn(() => mockSessions),
  saveSessions: vi.fn(),
  SESSIONS_KEY: 'atemi-sessions',
}))

import { SessionHistory } from '@/components/adversarial/SessionHistory'
import { loadSessions, saveSessions } from '@/lib/atemi-session-storage'

const mockLoadSessions = vi.mocked(loadSessions)
const mockSaveSessions = vi.mocked(saveSessions)

describe('SessionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadSessions.mockReturnValue(mockSessions)
  })

  it('TC-SESSH-001: returns null when no sessions', () => {
    mockLoadSessions.mockReturnValue([])
    const { container } = render(<SessionHistory />)
    expect(container.innerHTML).toBe('')
  })

  it('TC-SESSH-002: renders session count badge', () => {
    render(<SessionHistory />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Session History')).toBeInTheDocument()
  })

  it('TC-SESSH-003: collapsible header toggles session list', () => {
    render(<SessionHistory />)
    const headerBtn = screen.getByRole('button', { name: /session history/i })

    // List not visible initially
    expect(screen.queryByText('Test Session Alpha')).not.toBeInTheDocument()

    fireEvent.click(headerBtn)
    expect(screen.getByText('Test Session Alpha')).toBeInTheDocument()
    expect(screen.getByText('Test Session Beta')).toBeInTheDocument()
  })

  it('TC-SESSH-004: session rows display name and event count', () => {
    render(<SessionHistory />)
    fireEvent.click(screen.getByRole('button', { name: /session history/i }))

    expect(screen.getByText('Test Session Alpha')).toBeInTheDocument()
    expect(screen.getByText('2 events')).toBeInTheDocument()
    expect(screen.getByText('0 events')).toBeInTheDocument()
  })

  it('TC-SESSH-005: clicking review opens review panel dialog', () => {
    render(<SessionHistory />)
    fireEvent.click(screen.getByRole('button', { name: /session history/i }))

    const reviewBtn = screen.getByRole('button', { name: /review session: test session alpha/i })
    fireEvent.click(reviewBtn)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('TC-SESSH-006: review panel shows session config', () => {
    render(<SessionHistory />)
    fireEvent.click(screen.getByRole('button', { name: /session history/i }))
    fireEvent.click(screen.getByRole('button', { name: /review session: test session alpha/i }))

    expect(screen.getByText('Config Snapshot')).toBeInTheDocument()
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
    expect(screen.getByText('basic')).toBeInTheDocument()
    expect(screen.getByText('30s')).toBeInTheDocument()
  })

  it('TC-SESSH-007: review panel shows severity summary', () => {
    render(<SessionHistory />)
    fireEvent.click(screen.getByRole('button', { name: /session history/i }))
    fireEvent.click(screen.getByRole('button', { name: /review session: test session alpha/i }))

    expect(screen.getByText('Summary')).toBeInTheDocument()
    // Severity labels appear in summary grid (may appear multiple times due to event log)
    const criticalElements = screen.getAllByText('critical')
    expect(criticalElements.length).toBeGreaterThanOrEqual(1)
    const highElements = screen.getAllByText('high')
    expect(highElements.length).toBeGreaterThanOrEqual(1)
  })

  it('TC-SESSH-008: review panel shows event log', () => {
    render(<SessionHistory />)
    fireEvent.click(screen.getByRole('button', { name: /session history/i }))
    fireEvent.click(screen.getByRole('button', { name: /review session: test session alpha/i }))

    expect(screen.getByText('Event Log')).toBeInTheDocument()
    expect(screen.getByText('Injection attack started')).toBeInTheDocument()
    expect(screen.getByText('System prompt leaked')).toBeInTheDocument()
  })

  it('TC-SESSH-009: delete button removes session from list', () => {
    render(<SessionHistory />)
    fireEvent.click(screen.getByRole('button', { name: /session history/i }))

    const deleteBtns = screen.getAllByRole('button', { name: /delete session/i })
    fireEvent.click(deleteBtns[0])

    expect(mockSaveSessions).toHaveBeenCalled()
  })

  it('TC-SESSH-010: clear all removes all sessions', () => {
    render(<SessionHistory />)
    fireEvent.click(screen.getByRole('button', { name: /session history/i }))

    const clearBtn = screen.getByRole('button', { name: /clear all session history/i })
    fireEvent.click(clearBtn)

    expect(mockSaveSessions).toHaveBeenCalledWith([])
  })

  it('TC-SESSH-011: Escape key closes review panel', () => {
    render(<SessionHistory />)
    fireEvent.click(screen.getByRole('button', { name: /session history/i }))
    fireEvent.click(screen.getByRole('button', { name: /review session: test session alpha/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('TC-SESSH-012: header has aria-expanded attribute', () => {
    render(<SessionHistory />)
    const headerBtn = screen.getByRole('button', { name: /session history/i })
    expect(headerBtn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(headerBtn)
    expect(headerBtn).toHaveAttribute('aria-expanded', 'true')
  })
})
