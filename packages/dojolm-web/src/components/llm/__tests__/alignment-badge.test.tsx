/**
 * File: alignment-badge.test.tsx
 * Purpose: Tests for AlignmentBadge component
 * Epic: OBLITERATUS (OBL) — T1.1
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlignmentBadge } from '../AlignmentBadge'
import type { AlignmentImprint } from '@/lib/types'

const mockImprint: AlignmentImprint = {
  methodProbabilities: { DPO: 0.45, RLHF: 0.30, CAI: 0.15, SFT: 0.05, unknown: 0.05 },
  confidence: 0.82,
  refusalSharpness: 0.85,
  principleReferencing: 0.12,
  evidenceProbes: ['obl-align-01'],
}

describe('AlignmentBadge', () => {
  it('renders top method label', () => {
    render(<AlignmentBadge imprint={mockImprint} />)
    expect(screen.getAllByText('DPO').length).toBeGreaterThan(0)
  })

  it('renders top method probability', () => {
    render(<AlignmentBadge imprint={mockImprint} />)
    expect(screen.getAllByText('45%').length).toBeGreaterThan(0)
  })

  it('renders confidence bar', () => {
    const { container } = render(<AlignmentBadge imprint={mockImprint} />)
    const bar = container.querySelector('[title*="Confidence"]')
    expect(bar).toBeDefined()
  })

  it('renders tooltip with all methods on hover', () => {
    const { container } = render(<AlignmentBadge imprint={mockImprint} />)
    const tooltip = container.querySelector('.group-hover\\:block')
    expect(tooltip).toBeDefined()
    expect(tooltip?.textContent).toContain('RLHF')
    expect(tooltip?.textContent).toContain('CAI')
    expect(tooltip?.textContent).toContain('SFT')
  })

  it('handles RLHF as top method', () => {
    const rlhfImprint: AlignmentImprint = {
      ...mockImprint,
      methodProbabilities: { DPO: 0.10, RLHF: 0.60, CAI: 0.15, SFT: 0.10, unknown: 0.05 },
    }
    render(<AlignmentBadge imprint={rlhfImprint} />)
    expect(screen.getAllByText('RLHF').length).toBeGreaterThan(0)
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0)
  })
})
