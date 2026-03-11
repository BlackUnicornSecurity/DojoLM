/**
 * File: submissions-tab.test.tsx
 * Purpose: Unit tests for SubmissionsTab component
 * Test IDs: ST-001 to ST-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  FileText: () => <span data-testid="icon-filetext">F</span>,
  Clock: () => <span data-testid="icon-clock">C</span>,
  CheckCircle: () => <span>OK</span>,
  DollarSign: () => <span>$</span>,
  XCircle: () => <span>X</span>,
  Filter: () => <span data-testid="icon-filter">Filter</span>,
}))

vi.mock('../ronin/SubmissionWizard', () => ({
  SubmissionWizard: ({ onSave, onClose }: { onSave: (s: unknown) => void; onClose: () => void }) => (
    <div data-testid="submission-wizard">
      <button data-testid="wizard-save" onClick={() => onSave({
        id: 'sub-new',
        programId: 'prog-001',
        programName: 'Test Program',
        title: 'New Submission',
        status: 'draft',
        severity: 'high',
        cvssScore: 7.5,
        aiFactorScore: 1.2,
        finalScore: 8.7,
        evidence: [],
        description: 'Test',
        createdAt: '2026-03-10',
        updatedAt: '2026-03-10',
        payout: null,
      })}>Save</button>
      <button data-testid="wizard-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('../ronin/SubmissionDetail', () => ({
  SubmissionDetail: ({ submission, onClose }: { submission: { title: string }; onClose: () => void }) => (
    <div data-testid="submission-detail">
      <span>{submission.title}</span>
      <button data-testid="detail-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

import { SubmissionsTab } from '../ronin/SubmissionsTab'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_SUBMISSION = {
  id: 'sub-001',
  programId: 'prog-001',
  programName: 'OpenAI Bug Bounty',
  title: 'XSS in Plugin',
  status: 'submitted',
  severity: 'high',
  cvssScore: 8.1,
  aiFactorScore: 1.5,
  finalScore: 9.6,
  evidence: ['screenshot.png'],
  description: 'Found XSS',
  createdAt: '2026-03-01',
  updatedAt: '2026-03-05',
  payout: null,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SubmissionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('ST-001: shows empty state when no submissions', () => {
    render(<SubmissionsTab />)
    expect(screen.getByText('No submissions yet')).toBeInTheDocument()
  })

  it('ST-002: shows "Create Submission" button in empty state', () => {
    render(<SubmissionsTab />)
    expect(screen.getByText('Create Submission')).toBeInTheDocument()
  })

  it('ST-003: shows "New Submission" button in actions bar', () => {
    render(<SubmissionsTab />)
    expect(screen.getByText('New Submission')).toBeInTheDocument()
  })

  it('ST-004: shows stats section with Total, Active, Total Payouts', () => {
    render(<SubmissionsTab />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Total Payouts')).toBeInTheDocument()
  })

  it('ST-005: stats show 0 when no submissions', () => {
    render(<SubmissionsTab />)
    const totals = screen.getAllByText('0')
    expect(totals.length).toBeGreaterThanOrEqual(2)
  })

  it('ST-006: clicking New Submission opens wizard', async () => {
    const user = userEvent.setup()
    render(<SubmissionsTab />)
    await user.click(screen.getByText('New Submission'))
    expect(screen.getByTestId('submission-wizard')).toBeInTheDocument()
  })

  it('ST-007: closing wizard hides it', async () => {
    const user = userEvent.setup()
    render(<SubmissionsTab />)
    await user.click(screen.getByText('New Submission'))
    await user.click(screen.getByTestId('wizard-close'))
    expect(screen.queryByTestId('submission-wizard')).not.toBeInTheDocument()
  })

  it('ST-008: saving from wizard adds submission to list', async () => {
    const user = userEvent.setup()
    render(<SubmissionsTab />)
    await user.click(screen.getByText('New Submission'))
    await user.click(screen.getByTestId('wizard-save'))
    await waitFor(() => {
      expect(screen.getByText('New Submission', { selector: 'p' })).toBeInTheDocument()
    })
  })

  it('ST-009: loads submissions from localStorage', () => {
    localStorage.setItem('noda-ronin-submissions', JSON.stringify([MOCK_SUBMISSION]))
    render(<SubmissionsTab />)
    expect(screen.getByText('XSS in Plugin')).toBeInTheDocument()
  })

  it('ST-010: status filter select is rendered', () => {
    render(<SubmissionsTab />)
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument()
  })

  it('ST-011: clicking a submission opens detail', async () => {
    localStorage.setItem('noda-ronin-submissions', JSON.stringify([MOCK_SUBMISSION]))
    const user = userEvent.setup()
    render(<SubmissionsTab />)
    await user.click(screen.getByLabelText('XSS in Plugin \u2014 Submitted'))
    expect(screen.getByTestId('submission-detail')).toBeInTheDocument()
  })

  it('ST-012: closing detail hides it', async () => {
    localStorage.setItem('noda-ronin-submissions', JSON.stringify([MOCK_SUBMISSION]))
    const user = userEvent.setup()
    render(<SubmissionsTab />)
    await user.click(screen.getByLabelText('XSS in Plugin \u2014 Submitted'))
    await user.click(screen.getByTestId('detail-close'))
    expect(screen.queryByTestId('submission-detail')).not.toBeInTheDocument()
  })
})
