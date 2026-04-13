/**
 * File: concept-recon-panel.test.tsx
 * Purpose: Tests for ConceptReconPanel
 * Epic: OBLITERATUS (OBL) — T4.1
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConceptReconPanel } from '../ConceptReconPanel'
import type { ConceptGeometry } from '@/lib/types'

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}))

const mockGeometry: ConceptGeometry = {
  type: 'monolithic',
  facets: [
    { angle: 'Direct Topic', consistency: 0.95 },
    { angle: 'Framing', consistency: 0.90 },
    { angle: 'Persona', consistency: 0.92 },
  ],
  solidAngle: 0.92,
}

describe('ConceptReconPanel', () => {
  it('renders loading state', () => {
    render(<ConceptReconPanel geometry={null} isLoading={true} />)
    expect(screen.getByText(/Analyzing concept geometry/)).toBeDefined()
  })

  it('renders empty state when no data', () => {
    render(<ConceptReconPanel geometry={null} isLoading={false} />)
    expect(screen.getByText(/No geometry data/)).toBeDefined()
  })

  it('renders geometry type badge', () => {
    render(<ConceptReconPanel geometry={mockGeometry} isLoading={false} />)
    expect(screen.getByText('monolithic')).toBeDefined()
  })

  it('renders strategy text for monolithic', () => {
    render(<ConceptReconPanel geometry={mockGeometry} isLoading={false} />)
    expect(screen.getByText(/uniform safety boundaries/)).toBeDefined()
  })

  it('renders solid angle percentage', () => {
    render(<ConceptReconPanel geometry={mockGeometry} isLoading={false} />)
    expect(screen.getByText(/92%/)).toBeDefined()
  })

  it('renders polyhedral strategy text', () => {
    const polyGeometry: ConceptGeometry = {
      type: 'polyhedral',
      facets: [{ angle: 'Test', consistency: 0.3 }],
      solidAngle: 0.4,
    }
    render(<ConceptReconPanel geometry={polyGeometry} isLoading={false} />)
    expect(screen.getByText(/different refusal thresholds/)).toBeDefined()
  })
})
