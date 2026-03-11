/**
 * File: submission-wizard.test.tsx
 * Purpose: Unit tests for SubmissionWizard component
 * Test IDs: SW-001 to SW-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  safeUUID: () => 'mock-uuid-1234',
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: Record<string, unknown>) => (
    <button onClick={onClick as () => void} disabled={disabled as boolean} className={className as string}>
      {children as React.ReactNode}
    </button>
  ),
}))

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  ArrowRight: () => <span>-&gt;</span>,
  ArrowLeft: () => <span>&lt;-</span>,
  Check: () => <span>Check</span>,
  FileText: () => <span>FileText</span>,
  Shield: () => <span>Shield</span>,
  Brain: () => <span>Brain</span>,
  Eye: () => <span>Eye</span>,
}))

vi.mock('@/lib/data/ronin-seed-programs', () => ({
  SEED_PROGRAMS: [
    {
      id: 'prog-001',
      name: 'OpenAI Bug Bounty',
      company: 'OpenAI',
      platform: 'bugcrowd',
      status: 'active',
      scopeSummary: 'API, ChatGPT',
      rewardMin: 200,
      rewardMax: 20000,
      currency: 'USD',
      aiScope: true,
      owaspAiCategories: ['LLM01'],
      tags: ['LLM'],
      url: 'https://bugcrowd.com/openai',
      updatedAt: '2026-02-15',
    },
    {
      id: 'prog-011',
      name: 'Stability AI Program',
      company: 'Stability AI',
      platform: 'bugcrowd',
      status: 'paused',
      scopeSummary: 'Image generation',
      rewardMin: 100,
      rewardMax: 5000,
      currency: 'USD',
      aiScope: true,
      owaspAiCategories: ['LLM02'],
      tags: ['Image'],
      url: 'https://bugcrowd.com/stability',
      updatedAt: '2026-01-15',
    },
  ],
}))

vi.mock('../ronin/AISeverityCalculator', () => ({
  AISeverityCalculator: ({ onScoreChange }: { onScoreChange: (cvss: number, ai: number, final_: number) => void }) => (
    <div data-testid="severity-calculator">
      <button onClick={() => onScoreChange(8.5, 7.0, 8.0)} data-testid="set-score">Set Score</button>
    </div>
  ),
}))

import { SubmissionWizard } from '../ronin/SubmissionWizard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SubmissionWizard', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SW-001: renders wizard dialog with correct aria attributes', () => {
    render(<SubmissionWizard {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'New Submission Wizard')
  })

  it('SW-002: renders "New Submission" heading', () => {
    render(<SubmissionWizard {...defaultProps} />)
    expect(screen.getByText('New Submission')).toBeInTheDocument()
  })

  it('SW-003: renders step 0 fields (program, title, description)', () => {
    render(<SubmissionWizard {...defaultProps} />)
    expect(screen.getByLabelText('Bug Bounty Program')).toBeInTheDocument()
    expect(screen.getByLabelText('Vulnerability Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('SW-004: only shows active programs in the select dropdown', () => {
    render(<SubmissionWizard {...defaultProps} />)
    const select = screen.getByLabelText('Bug Bounty Program') as HTMLSelectElement
    const options = Array.from(select.options).map(o => o.textContent)
    expect(options).toContain('OpenAI Bug Bounty (OpenAI)')
    // paused program should NOT appear
    expect(options).not.toContain('Stability AI Program (Stability AI)')
  })

  it('SW-005: Next button is disabled when step 0 fields are empty', () => {
    render(<SubmissionWizard {...defaultProps} />)
    const nextBtn = screen.getByText('Next')
    expect(nextBtn.closest('button')).toBeDisabled()
  })

  it('SW-006: Next button enables after filling step 0 fields', () => {
    render(<SubmissionWizard {...defaultProps} />)
    fireEvent.change(screen.getByLabelText('Bug Bounty Program'), { target: { value: 'prog-001' } })
    fireEvent.change(screen.getByLabelText('Vulnerability Title'), { target: { value: 'Test vuln' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Some description' } })
    expect(screen.getByText('Next').closest('button')).not.toBeDisabled()
  })

  it('SW-007: clicking Next advances to step 1 (Evidence)', () => {
    render(<SubmissionWizard {...defaultProps} />)
    fireEvent.change(screen.getByLabelText('Bug Bounty Program'), { target: { value: 'prog-001' } })
    fireEvent.change(screen.getByLabelText('Vulnerability Title'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Desc' } })
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText(/Add evidence/)).toBeInTheDocument()
    expect(screen.getByLabelText('Evidence item 1')).toBeInTheDocument()
  })

  it('SW-008: Back button appears on step 1 and returns to step 0', () => {
    render(<SubmissionWizard {...defaultProps} />)
    // No back button on step 0
    expect(screen.queryByText('Back')).not.toBeInTheDocument()
    // Advance to step 1
    fireEvent.change(screen.getByLabelText('Bug Bounty Program'), { target: { value: 'prog-001' } })
    fireEvent.change(screen.getByLabelText('Vulnerability Title'), { target: { value: 'T' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'D' } })
    fireEvent.click(screen.getByText('Next'))
    // Back button should appear
    expect(screen.getByText('Back')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByLabelText('Vulnerability Title')).toBeInTheDocument()
  })

  it('SW-009: calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<SubmissionWizard {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close wizard'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('SW-010: calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<SubmissionWizard {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('SW-011: calls onClose when backdrop overlay is clicked', () => {
    const onClose = vi.fn()
    render(<SubmissionWizard {...defaultProps} onClose={onClose} />)
    // The outer div with bg-black/50 is the overlay
    const overlay = screen.getByRole('dialog').parentElement!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('SW-012: pre-selects program when initialProgramId is provided', () => {
    render(<SubmissionWizard {...defaultProps} initialProgramId="prog-001" />)
    const select = screen.getByLabelText('Bug Bounty Program') as HTMLSelectElement
    expect(select.value).toBe('prog-001')
  })
})
