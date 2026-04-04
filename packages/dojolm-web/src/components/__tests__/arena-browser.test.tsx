/**
 * File: arena-browser.test.tsx
 * Purpose: Unit tests for ArenaBrowser component
 * Test IDs: AB-001 to AB-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/tabs', () => {
  const React = require('react')
  const TabsContext = React.createContext({
    value: '',
    setValue: (_nextValue: string) => {},
  })

  const Tabs = ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange: (v: string) => void
  }) => {
    const [internalValue, setInternalValue] = React.useState(value)

    React.useEffect(() => {
      setInternalValue(value)
    }, [value])

    const handleChange = (nextValue: string) => {
      setInternalValue(nextValue)
      onValueChange(nextValue)
    }

    return (
      <TabsContext.Provider value={{ value: internalValue, setValue: handleChange }}>
        <div data-testid="tabs" data-value={internalValue}>{children}</div>
      </TabsContext.Provider>
    )
  }

  const TabsList = ({
    children,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode
    'aria-label'?: string
  }) => (
    <div role="tablist" aria-label={ariaLabel}>{children}</div>
  )

  const TabsTrigger = ({
    children,
    value,
  }: {
    children: React.ReactNode
    value: string
  }) => {
    const { value: activeValue, setValue } = React.useContext(TabsContext)

    return (
      <button
        role="tab"
        data-value={value}
        aria-selected={activeValue === value}
        onClick={() => setValue(value)}
      >
        {children}
      </button>
    )
  }

  return { Tabs, TabsList, TabsTrigger }
})

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, dot }: { children: React.ReactNode; variant?: string; dot?: boolean }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel, variant, size }: Record<string, unknown>) => (
    <button onClick={onClick as () => void} aria-label={ariaLabel as string}>
      {children as React.ReactNode}
    </button>
  ),
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) => (
    <td className={className} colSpan={colSpan}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <tr onClick={onClick} className={className}>{children}</tr>
  ),
}))

vi.mock('lucide-react', () => ({
  Swords: () => <span data-testid="icon-swords">Swords</span>,
  Trophy: () => <span>Trophy</span>,
  Crown: () => <span>Crown</span>,
  Flag: () => <span>Flag</span>,
  Shield: () => <span>Shield</span>,
  Eye: () => <span>Eye</span>,
  Clock: () => <span>Clock</span>,
  X: () => <span>X</span>,
  ChevronRight: () => <span>&gt;</span>,
  AlertTriangle: () => <span>Alert</span>,
  CheckCircle: () => <span>Check</span>,
  XCircle: () => <span>XCircle</span>,
  Plus: () => <span>+</span>,
  Loader2: () => <span data-testid="loader">Loading</span>,
  Download: () => <span>Download</span>,
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('../strategic/arena/MatchCreationWizard', () => ({
  MatchCreationWizard: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    open ? <div data-testid="match-wizard"><button onClick={onClose}>CloseWizard</button></div> : null
  ),
}))

vi.mock('../strategic/arena/LiveMatchView', () => ({
  LiveMatchView: () => <div data-testid="live-view">LiveMatch</div>,
}))

vi.mock('../strategic/arena/WarriorCardGrid', () => ({
  WarriorCardGrid: ({ warriors }: { warriors: unknown[] }) => (
    <div data-testid="warrior-grid">Warriors: {warriors.length}</div>
  ),
}))

vi.mock('../strategic/arena/BattleLogExporter', () => ({
  BattleLogExporter: () => <div data-testid="battle-log-exporter">Exporter</div>,
}))

vi.mock('../strategic/ArenaRoster', () => ({
  ArenaRoster: () => <div data-testid="arena-roster">Arena Roster</div>,
}))

vi.mock('../strategic/arena/ArenaRulesWidget', () => ({
  ArenaRulesWidget: () => <div data-testid="arena-rules">Arena Rules</div>,
}))

vi.mock('../strategic/arena/MatchStatsWidget', () => ({
  MatchStatsWidget: () => <div data-testid="arena-stats">Arena Stats</div>,
}))

import { ArenaBrowser } from '../strategic/ArenaBrowser'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockMatch = {
  id: 'match-001',
  config: { gameMode: 'CTF' as const, attackMode: 'kunai' as const, maxRounds: 20, victoryPoints: 100, roundTimeoutMs: 30000, roleSwitchInterval: 5 },
  fighters: [
    { modelId: 'gpt-4', modelName: 'GPT-4', provider: 'openai', initialRole: 'attacker' as const },
    { modelId: 'claude-3', modelName: 'Claude 3', provider: 'anthropic', initialRole: 'defender' as const },
  ],
  status: 'completed' as const,
  rounds: [{ roundNumber: 1 }],
  scores: { 'gpt-4': 50, 'claude-3': 30 },
  winnerId: 'gpt-4',
  winReason: 'Victory points reached',
  events: [],
  createdAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  totalDurationMs: 60000,
  metadata: {},
}

function setupMockFetch(matches: unknown[] = [], warriors: unknown[] = []) {
  mockFetchWithAuth.mockImplementation((url: string) => {
    if (url.includes('/api/arena/warriors')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ warriors }) })
    }
    if (url.includes('/api/arena')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches }) })
    }
    return Promise.resolve({ ok: false })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArenaBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockFetch()
  })

  it('AB-001: renders header with Battle Arena title', async () => {
    mockFetchWithAuth.mockImplementation(() => new Promise(() => {}))
    render(<ArenaBrowser />)
    expect(screen.getByText('Battle Arena')).toBeInTheDocument()
    expect(screen.getByText('Multi-agent adversarial sandbox')).toBeInTheDocument()
  })

  it('AB-002: renders "New Stand Off" button', async () => {
    mockFetchWithAuth.mockImplementation(() => new Promise(() => {}))
    render(<ArenaBrowser />)
    expect(screen.getByText('New Stand Off')).toBeInTheDocument()
  })

  it('AB-003: renders game mode tabs', async () => {
    mockFetchWithAuth.mockImplementation(() => new Promise(() => {}))
    render(<ArenaBrowser />)
    expect(screen.getByText('All Modes')).toBeInTheDocument()
    expect(screen.getByText('Capture the Flag')).toBeInTheDocument()
    expect(screen.getByText('King of the Hill')).toBeInTheDocument()
    expect(screen.getByText('Red vs Blue')).toBeInTheDocument()
  })

  it('AB-004: shows loading state initially', async () => {
    mockFetchWithAuth.mockImplementation(() => new Promise(() => {}))
    render(<ArenaBrowser />)
    expect(screen.getByText('Loading matches...')).toBeInTheDocument()
  })

  it('AB-005: shows match table after data loads', async () => {
    setupMockFetch([mockMatch])
    render(<ArenaBrowser />)
    await waitFor(() => {
      expect(screen.getByText('Matches')).toBeInTheDocument()
    })
  })

  it('AB-006: displays match count in description', async () => {
    setupMockFetch([mockMatch])
    render(<ArenaBrowser />)
    await waitFor(() => {
      expect(screen.getByText('1 matches found')).toBeInTheDocument()
    })
  })

  it('AB-007: shows empty state when no matches', async () => {
    setupMockFetch([])
    render(<ArenaBrowser />)
    await waitFor(() => {
      expect(screen.getByText(/No matches found/)).toBeInTheDocument()
    })
  })

  it('AB-008: renders fighter names in match rows', async () => {
    setupMockFetch([mockMatch])
    render(<ArenaBrowser />)
    await waitFor(() => {
      // GPT-4 appears both as fighter name and as winner
      const gpt4Elements = screen.getAllByText('GPT-4')
      expect(gpt4Elements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Claude 3')).toBeInTheDocument()
    })
  })

  it('AB-009: renders winner name for completed matches', async () => {
    setupMockFetch([mockMatch])
    render(<ArenaBrowser />)
    await waitFor(() => {
      // Winner GPT-4 appears in the winner column with success styling
      const gpt4Elements = screen.getAllByText('GPT-4')
      // At least 2: one in fighters cell, one in winner cell
      expect(gpt4Elements.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('AB-010: displays active match count badge', async () => {
    const runningMatch = { ...mockMatch, id: 'match-002', status: 'running' }
    setupMockFetch([runningMatch])
    render(<ArenaBrowser />)
    await waitFor(() => {
      expect(screen.getByText(/1 active match/)).toBeInTheDocument()
    })
  })

  it('AB-011: opens wizard when New Stand Off is clicked', async () => {
    setupMockFetch([])
    render(<ArenaBrowser />)
    await waitFor(() => {
      expect(screen.queryByTestId('match-wizard')).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('New Stand Off'))
    expect(screen.getByTestId('match-wizard')).toBeInTheDocument()
  })

  it('AB-012: renders warrior card grid after loading', async () => {
    setupMockFetch([], [{ modelId: 'gpt-4', modelName: 'GPT-4' }])
    render(<ArenaBrowser />)
    await waitFor(() => {
      expect(screen.getByTestId('warrior-grid')).toBeInTheDocument()
      expect(screen.getByText('Warriors: 1')).toBeInTheDocument()
    })
  })

  it('AB-013: exposes roster, rules, and stats views', async () => {
    setupMockFetch([mockMatch], [{ modelId: 'gpt-4', modelName: 'GPT-4' }])
    render(<ArenaBrowser />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Roster' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Rules' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Stats' })).toBeInTheDocument()
    })
  })

  it('AB-014: switches to the roster view', async () => {
    setupMockFetch([mockMatch], [{ modelId: 'gpt-4', modelName: 'GPT-4' }])
    render(<ArenaBrowser />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Roster' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: 'Roster' }))
    expect(screen.getByTestId('arena-roster')).toBeInTheDocument()
  })

  it('AB-015: switches to the rules and stats views', async () => {
    setupMockFetch([mockMatch], [{ modelId: 'gpt-4', modelName: 'GPT-4' }])
    render(<ArenaBrowser />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Rules' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: 'Rules' }))
    expect(screen.getByTestId('arena-rules')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Stats' }))
    expect(screen.getByTestId('arena-stats')).toBeInTheDocument()
  })
})
