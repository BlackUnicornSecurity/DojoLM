/**
 * File: kumite-config.test.tsx
 * Purpose: Unit tests for KumiteConfig (SAGEConfig, ArenaConfig, MitsukeConfig)
 * Test IDs: KC-001 to KC-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

const mockOnClose = vi.fn()
const mockOnSave = vi.fn()
const mockOnReset = vi.fn()
const mockOnChange = vi.fn()

let capturedProps: Record<string, unknown> = {}

vi.mock('@/components/ui/ConfigPanel', () => ({
  ConfigPanel: (props: Record<string, unknown>) => {
    capturedProps = props
    if (!props.isOpen) return null
    return (
      <div data-testid="config-panel">
        <h2>{props.title as string}</h2>
        <div data-testid="config-sections">
          {(props.sections as Array<{ id: string; label: string }>)?.map((s) => (
            <div key={s.id} data-testid={`section-${s.id}`}>{s.label}</div>
          ))}
        </div>
        <button data-testid="save-btn" onClick={props.onSave as () => void}>Save</button>
        <button data-testid="reset-btn" onClick={props.onReset as () => void}>Reset</button>
        <button data-testid="close-btn" onClick={props.onClose as () => void}>Close</button>
      </div>
    )
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { SAGEConfig, ArenaConfig, MitsukeConfig } from '../strategic/KumiteConfig'

// ---------------------------------------------------------------------------
// Storage mock
// ---------------------------------------------------------------------------

const storageMock: Record<string, string> = {}
beforeEach(() => {
  vi.clearAllMocks()
  capturedProps = {}
  Object.keys(storageMock).forEach(k => delete storageMock[k])
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => storageMock[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { storageMock[key] = val }),
    removeItem: vi.fn((key: string) => { delete storageMock[key] }),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  })
})

// ---------------------------------------------------------------------------
// SAGEConfig Tests
// ---------------------------------------------------------------------------

describe('SAGEConfig', () => {
  it('KC-001: renders nothing when isOpen is false', () => {
    const { container } = render(<SAGEConfig isOpen={false} onClose={mockOnClose} />)
    expect(container.innerHTML).toBe('')
  })

  it('KC-002: renders SAGE Configuration title when open', () => {
    render(<SAGEConfig isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText('SAGE Configuration')).toBeInTheDocument()
  })

  it('KC-003: renders mutation weights section', () => {
    render(<SAGEConfig isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByTestId('section-mutation-weights')).toBeInTheDocument()
    expect(screen.getByText('Mutation Operator Weights')).toBeInTheDocument()
  })

  it('KC-004: renders thresholds section', () => {
    render(<SAGEConfig isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByTestId('section-thresholds')).toBeInTheDocument()
  })

  it('KC-005: renders seed library section with count', () => {
    render(<SAGEConfig isOpen={true} onClose={mockOnClose} />)
    const seedSection = screen.getByTestId('section-seed-library')
    expect(seedSection).toBeInTheDocument()
    expect(seedSection.textContent).toContain('Seed Library (3)')
  })

  it('KC-006: calls onSave which persists to localStorage', () => {
    render(<SAGEConfig isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('save-btn'))
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'kumite-sage-config',
      expect.any(String)
    )
  })

  it('KC-007: calls onClose when close button is clicked', () => {
    render(<SAGEConfig isOpen={true} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(mockOnClose).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// ArenaConfig Tests
// ---------------------------------------------------------------------------

describe('ArenaConfig', () => {
  it('KC-008: renders Arena Configuration title when open', () => {
    render(<ArenaConfig isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText('Arena Configuration')).toBeInTheDocument()
  })

  it('KC-009: renders roster, match-settings, and model-defaults sections', () => {
    render(<ArenaConfig isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByTestId('section-roster')).toBeInTheDocument()
    expect(screen.getByTestId('section-match-settings')).toBeInTheDocument()
    expect(screen.getByTestId('section-model-defaults')).toBeInTheDocument()
  })

  it('KC-010: passes correct default values for arena config', () => {
    render(<ArenaConfig isOpen={true} onClose={mockOnClose} />)
    const values = capturedProps.values as Record<string, unknown>
    expect(values.matchDuration).toBe(300)
    expect(values.scoringPreset).toBe('default')
    expect(values.gameMode).toBe('ctf')
    expect(values.temperature).toBe(0.7)
  })
})

// ---------------------------------------------------------------------------
// MitsukeConfig Tests
// ---------------------------------------------------------------------------

describe('MitsukeConfig', () => {
  it('KC-011: renders Mitsuke Configuration title when open', () => {
    render(<MitsukeConfig isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText('Mitsuke Configuration')).toBeInTheDocument()
  })

  it('KC-012: renders sources, alerts, and extraction sections', () => {
    render(<MitsukeConfig isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByTestId('section-sources')).toBeInTheDocument()
    expect(screen.getByTestId('section-alerts')).toBeInTheDocument()
    expect(screen.getByTestId('section-extraction')).toBeInTheDocument()
  })
})
