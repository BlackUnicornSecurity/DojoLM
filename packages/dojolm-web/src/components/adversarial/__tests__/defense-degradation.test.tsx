/**
 * File: defense-degradation.test.tsx
 * Purpose: Tests for DefenseDegradationIndicator
 * Epic: OBLITERATUS (OBL) — T3.1
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DefenseDegradationIndicator } from '../DefenseDegradationIndicator'

// Mock recharts to avoid rendering issues in test environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}))

describe('DefenseDegradationIndicator', () => {
  it('renders degradation chart title', () => {
    render(
      <DefenseDegradationIndicator
        degradationCurve={[0.95, 0.85, 0.70, 0.60, 0.80]}
        recoveryRate={0.80}
      />,
    )
    expect(screen.getByText('Defense Degradation')).toBeDefined()
  })

  it('renders recovery rate percentage', () => {
    render(
      <DefenseDegradationIndicator
        degradationCurve={[0.95, 0.85, 0.70]}
        recoveryRate={0.75}
      />,
    )
    expect(screen.getByText('75%')).toBeDefined()
  })

  it('renders with empty curve', () => {
    render(
      <DefenseDegradationIndicator
        degradationCurve={[]}
        recoveryRate={0}
      />,
    )
    expect(screen.getByText('0%')).toBeDefined()
  })
})
