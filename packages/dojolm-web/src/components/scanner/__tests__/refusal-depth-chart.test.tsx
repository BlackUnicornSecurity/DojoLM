/**
 * File: refusal-depth-chart.test.tsx
 * Purpose: Tests for RefusalDepthChart
 * Epic: OBLITERATUS (OBL) — T5.1
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RefusalDepthChart } from '../RefusalDepthChart'
import type { RefusalDepthProfile } from '@/lib/types'

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}))

const mockProfile: RefusalDepthProfile = {
  thresholds: [
    { promptSeverity: 1, refusalProbability: 0 },
    { promptSeverity: 2, refusalProbability: 0 },
    { promptSeverity: 3, refusalProbability: 0 },
    { promptSeverity: 4, refusalProbability: 0 },
    { promptSeverity: 5, refusalProbability: 0.33 },
    { promptSeverity: 6, refusalProbability: 0.67 },
    { promptSeverity: 7, refusalProbability: 1 },
    { promptSeverity: 8, refusalProbability: 1 },
    { promptSeverity: 9, refusalProbability: 1 },
    { promptSeverity: 10, refusalProbability: 1 },
  ],
  activationDepth: 'medium',
  sharpness: 0.67,
}

describe('RefusalDepthChart', () => {
  it('renders nothing when profile is null', () => {
    const { container } = render(<RefusalDepthChart profile={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders depth badge', () => {
    render(<RefusalDepthChart profile={mockProfile} />)
    expect(screen.getByText('medium')).toBeDefined()
  })

  it('renders chart title', () => {
    render(<RefusalDepthChart profile={mockProfile} />)
    expect(screen.getAllByText('Refusal Depth Profile').length).toBeGreaterThan(0)
  })

  it('renders sharpness percentage', () => {
    render(<RefusalDepthChart profile={mockProfile} />)
    expect(screen.getByText('67%')).toBeDefined()
  })
})
