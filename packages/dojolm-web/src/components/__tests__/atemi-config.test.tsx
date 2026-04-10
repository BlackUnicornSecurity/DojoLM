/**
 * File: atemi-config.test.tsx
 * Purpose: Tests for AtemiConfig slide-in panel
 * Test IDs: ACF-001 to ACF-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { AtemiConfig } from '../adversarial/AtemiConfig'

// ===========================================================================
// ACF-001: Does not render when closed
// ===========================================================================
describe('ACF-001: Does not render when closed', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AtemiConfig isOpen={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})

// ===========================================================================
// ACF-002: Renders dialog when open
// ===========================================================================
describe('ACF-002: Renders dialog when open', () => {
  it('renders dialog panel with title when isOpen is true', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Atemi Lab Config')).toBeInTheDocument()
  })
})

// ===========================================================================
// ACF-003: Close button calls onClose
// ===========================================================================
describe('ACF-003: Close button calls onClose', () => {
  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<AtemiConfig isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close config panel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
// ACF-004: Escape key closes panel
// ===========================================================================
describe('ACF-004: Escape key closes panel', () => {
  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<AtemiConfig isOpen={true} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
// ACF-005: Target LLM input renders
// ===========================================================================
describe('ACF-005: Target LLM input renders', () => {
  it('shows Target LLM fieldset with input', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Target LLM')).toBeInTheDocument()
    expect(screen.getByLabelText('Target model name')).toBeInTheDocument()
  })
})

// ===========================================================================
// ACF-006: Attack mode radio group
// ===========================================================================
describe('ACF-006: Attack mode radio group', () => {
  it('renders 4 attack mode radio buttons', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    const radiogroup = screen.getByRole('radiogroup', { name: 'Attack mode' })
    expect(radiogroup).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /passive/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /basic/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /advanced/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /aggressive/i })).toBeInTheDocument()
  })
})

// ===========================================================================
// ACF-007: Default mode is passive
// ===========================================================================
describe('ACF-007: Default attack mode is passive', () => {
  it('passive is checked by default', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    const passive = screen.getByRole('radio', { name: /passive/i })
    expect(passive).toHaveAttribute('aria-checked', 'true')
  })
})

// ===========================================================================
// ACF-008: Concurrency slider
// ===========================================================================
describe('ACF-008: Concurrency slider', () => {
  it('renders concurrency range slider with default value 1', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Concurrency')).toBeInTheDocument()
    const slider = screen.getByLabelText('Concurrent attack threads')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveValue('1')
  })
})

// ===========================================================================
// ACF-009: Timeout slider
// ===========================================================================
describe('ACF-009: Timeout slider', () => {
  it('renders timeout range slider', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Timeout')).toBeInTheDocument()
    const slider = screen.getByLabelText('Request timeout in milliseconds')
    expect(slider).toBeInTheDocument()
  })
})

// ===========================================================================
// ACF-010: Auto-log toggle
// ===========================================================================
describe('ACF-010: Auto-log toggle', () => {
  it('renders auto-log switch defaulting to on', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    const toggle = screen.getByRole('switch', { name: 'Toggle auto-logging' })
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })
})

// ===========================================================================
// ACF-011: Save button saves config and closes
// ===========================================================================
describe('ACF-011: Save button saves and closes', () => {
  it('saves config to localStorage and calls onClose + onSave', () => {
    const onClose = vi.fn()
    const onSave = vi.fn()
    render(<AtemiConfig isOpen={true} onClose={onClose} onSave={onSave} />)
    fireEvent.click(screen.getByText('Save Configuration'))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(localStorageMock.getItem('atemi-config')).not.toBeNull()
  })
})

// ===========================================================================
// ACF-012: Reset button resets to defaults
// ===========================================================================
describe('ACF-012: Reset button resets to defaults', () => {
  it('resets config when Reset button is clicked', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    // Change target model
    const input = screen.getByLabelText('Target model name')
    fireEvent.change(input, { target: { value: 'gpt-4o' } })
    expect(input).toHaveValue('gpt-4o')
    // Click reset
    fireEvent.click(screen.getByText('Reset'))
    expect(input).toHaveValue('')
  })
})

// ===========================================================================
// ACF-013: Orchestrator Strategy radiogroup renders
// ===========================================================================
describe('ACF-013: Orchestrator Strategy radiogroup', () => {
  it('renders radiogroup with None + 5 strategy options', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    const radiogroup = screen.getByRole('radiogroup', { name: 'Orchestrator strategy' })
    expect(radiogroup).toBeInTheDocument()
    // "None" + 5 strategies = 6 radio buttons
    const radios = screen.getAllByRole('radio').filter(
      (r) => radiogroup.contains(r),
    )
    expect(radios).toHaveLength(6)
    // Verify each named option exists
    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('PAIR')).toBeInTheDocument()
    expect(screen.getByText('Crescendo')).toBeInTheDocument()
    expect(screen.getByText('TAP')).toBeInTheDocument()
    // None is selected by default
    const noneRadio = radios.find((r) => r.getAttribute('aria-checked') === 'true')
    expect(noneRadio).toBeDefined()
  })
})

// ===========================================================================
// ACF-016: RAG Attack Vector dropdown
// ===========================================================================
describe('ACF-016: RAG Attack Vector dropdown', () => {
  it('renders dropdown with None default + 8 vector options', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    const select = screen.getByLabelText('Attack Vector')
    expect(select).toBeInTheDocument()
    const options = select.querySelectorAll('option')
    // "None (no RAG targeting)" + 8 vectors = 9 options
    expect(options).toHaveLength(9)
    expect(options[0].textContent).toBe('None (no RAG targeting)')
    expect(options[0]).toHaveValue('')
  })
})

// ===========================================================================
// ACF-017: RAG Pipeline Stage dropdown
// ===========================================================================
describe('ACF-017: RAG Pipeline Stage dropdown', () => {
  it('renders dropdown with All stages default + 5 stage options', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    const select = screen.getByLabelText('Pipeline Stage')
    expect(select).toBeInTheDocument()
    const options = select.querySelectorAll('option')
    // "All stages" + 5 stages = 6 options
    expect(options).toHaveLength(6)
    expect(options[0].textContent).toBe('All stages')
    expect(options[0]).toHaveValue('')
  })
})
