/**
 * File: xray-panel.test.tsx
 * Purpose: Unit tests for XRayPanel component
 * Story: H27.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('lucide-react', () => ({
  Search: () => <span>SearchIcon</span>,
  Shield: () => <span>ShieldIcon</span>,
  AlertTriangle: () => <span>AlertIcon</span>,
  ChevronDown: () => <span>ChevDown</span>,
  ChevronRight: () => <span>ChevRight</span>,
  Zap: () => <span>ZapIcon</span>,
  BookOpen: () => <span>BookIcon</span>,
  Wrench: () => <span>WrenchIcon</span>,
}))

import { XRayPanel } from '../attackdna/XRayPanel'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockPatterns = [
  {
    id: 'role-hijacking',
    name: 'Role Hijacking',
    category: 'prompt-injection',
    description: 'Attempts to override the system role.',
    bypassMechanism: 'the attacker inserts text that mimics system prompts',
    bypasses: ['System prompt boundary', 'Role separation'],
    mitigations: ['Enforce strict system/user message boundaries'],
    keywords: ['system prompt', 'override'],
  },
  {
    id: 'base64-wrapping',
    name: 'Base64 Wrapping',
    category: 'encoding',
    description: 'Encodes malicious instructions in base64.',
    bypassMechanism: 'base64-encoded text appears as random strings to filters',
    bypasses: ['Text pattern matching', 'Keyword detection'],
    mitigations: ['Detect and decode base64 content before scanning'],
    keywords: ['base64', 'encode'],
  },
  {
    id: 'svg-active-content',
    name: 'SVG Active Content',
    category: 'multimodal',
    description: 'Embeds executable content in SVG files.',
    bypassMechanism: 'SVG can contain JavaScript enabling code execution',
    bypasses: ['Image format trust'],
    mitigations: ['Strip all active content from SVGs'],
    keywords: ['SVG', 'script'],
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('XRayPanel', () => {
  it('XR-001: renders attack patterns count', () => {
    render(<XRayPanel patterns={mockPatterns} />)
    expect(screen.getByText('3 patterns')).toBeInTheDocument()
  })

  it('XR-002: renders pattern names', () => {
    render(<XRayPanel patterns={mockPatterns} />)
    expect(screen.getByText('Role Hijacking')).toBeInTheDocument()
    expect(screen.getByText('Base64 Wrapping')).toBeInTheDocument()
    expect(screen.getByText('SVG Active Content')).toBeInTheDocument()
  })

  it('XR-003: shows empty state when no pattern selected', () => {
    render(<XRayPanel patterns={mockPatterns} />)
    expect(screen.getByText('Select a pattern to see its explanation')).toBeInTheDocument()
  })

  it('XR-004: shows explanation when pattern is selected', async () => {
    const user = userEvent.setup()
    render(<XRayPanel patterns={mockPatterns} />)
    const patternBtn = screen.getByLabelText('Attack pattern: Role Hijacking')
    await user.click(patternBtn)
    expect(screen.getByText('Why It Works')).toBeInTheDocument()
    expect(screen.getByText('Bypasses')).toBeInTheDocument()
    expect(screen.getByText('Suggested Mitigations')).toBeInTheDocument()
  })

  it('XR-005: shows bypass mechanism in explanation', async () => {
    const user = userEvent.setup()
    render(<XRayPanel patterns={mockPatterns} />)
    await user.click(screen.getByLabelText('Attack pattern: Role Hijacking'))
    expect(screen.getByText(/the attacker inserts text that mimics system prompts/)).toBeInTheDocument()
  })

  it('XR-006: shows mitigations list', async () => {
    const user = userEvent.setup()
    render(<XRayPanel patterns={mockPatterns} />)
    await user.click(screen.getByLabelText('Attack pattern: Role Hijacking'))
    expect(screen.getByText('Enforce strict system/user message boundaries')).toBeInTheDocument()
  })

  it('XR-007: filters patterns by search query', async () => {
    const user = userEvent.setup()
    render(<XRayPanel patterns={mockPatterns} />)
    const searchInput = screen.getByLabelText('Search attack patterns')
    await user.type(searchInput, 'base64')
    expect(screen.getByText('Base64 Wrapping')).toBeInTheDocument()
    expect(screen.queryByText('Role Hijacking')).not.toBeInTheDocument()
    expect(screen.getByText('1 patterns')).toBeInTheDocument()
  })

  it('XR-008: shows no results message for empty search', async () => {
    const user = userEvent.setup()
    render(<XRayPanel patterns={mockPatterns} />)
    const searchInput = screen.getByLabelText('Search attack patterns')
    await user.type(searchInput, 'zzzznonexistent')
    expect(screen.getByText('No patterns match your search.')).toBeInTheDocument()
  })

  it('XR-009: groups patterns by category', () => {
    render(<XRayPanel patterns={mockPatterns} />)
    expect(screen.getByText(/Prompt Injection.*1/)).toBeInTheDocument()
    expect(screen.getByText(/Encoding.*1/)).toBeInTheDocument()
    expect(screen.getByText(/Multimodal.*1/)).toBeInTheDocument()
  })

  it('XR-010: renders Forge Defense button when handler provided', async () => {
    const mockNavigate = vi.fn()
    const user = userEvent.setup()
    render(<XRayPanel patterns={mockPatterns} onNavigateToForge={mockNavigate} />)
    await user.click(screen.getByLabelText('Attack pattern: Role Hijacking'))
    const forgeBtn = screen.getByText('Open Forge Defense')
    expect(forgeBtn).toBeInTheDocument()
    await user.click(forgeBtn)
    expect(mockNavigate).toHaveBeenCalled()
  })

  it('XR-011: renders with no patterns', () => {
    render(<XRayPanel patterns={[]} />)
    expect(screen.getByText('0 patterns')).toBeInTheDocument()
  })

  it('XR-012: renders with default empty patterns', () => {
    render(<XRayPanel />)
    expect(screen.getByText('0 patterns')).toBeInTheDocument()
  })

  it('XR-013: pattern buttons have proper aria-current on selection', async () => {
    const user = userEvent.setup()
    render(<XRayPanel patterns={mockPatterns} />)
    const btn = screen.getByLabelText('Attack pattern: Role Hijacking')
    expect(btn).not.toHaveAttribute('aria-current')
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-current', 'true')
  })

  it('XR-014: search input has proper aria-label', () => {
    render(<XRayPanel patterns={mockPatterns} />)
    expect(screen.getByLabelText('Search attack patterns')).toBeInTheDocument()
  })
})
