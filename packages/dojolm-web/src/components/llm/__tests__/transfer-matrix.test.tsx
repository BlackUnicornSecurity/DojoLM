/**
 * File: transfer-matrix.test.tsx
 * Purpose: Tests for TransferMatrix component
 * Epic: OBLITERATUS (OBL) — T1.2
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransferMatrix } from '../TransferMatrix'
import type { TransferScore } from '@/lib/types'

const mockScores: TransferScore[] = [
  {
    sourceModelId: 'model-a',
    targetModelId: 'model-b',
    correlation: 0.75,
    sharedVulnerabilities: ['injection', 'xss'],
    divergentVulnerabilities: ['csrf'],
  },
]

const mockNames: Record<string, string> = {
  'model-a': 'GPT-4',
  'model-b': 'Claude-3',
}

describe('TransferMatrix', () => {
  it('renders nothing for empty scores', () => {
    const { container } = render(<TransferMatrix scores={[]} modelNames={{}} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders matrix with model names', () => {
    render(<TransferMatrix scores={mockScores} modelNames={mockNames} />)
    expect(screen.getByText('Vulnerability Transfer Matrix')).toBeDefined()
  })

  it('displays correlation percentage', () => {
    render(<TransferMatrix scores={mockScores} modelNames={mockNames} />)
    // Both cells (a,b) and (b,a) show the same score
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0)
  })

  it('renders color legend', () => {
    render(<TransferMatrix scores={mockScores} modelNames={mockNames} />)
    expect(screen.getByText(/Low/)).toBeDefined()
    expect(screen.getByText(/Medium/)).toBeDefined()
    expect(screen.getByText(/High/)).toBeDefined()
  })

  it('renders diagonal as dash', () => {
    render(<TransferMatrix scores={mockScores} modelNames={mockNames} />)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBe(2) // Two models, each has a diagonal cell
  })
})
