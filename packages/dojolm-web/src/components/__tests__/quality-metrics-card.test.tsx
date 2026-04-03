/**
 * File: quality-metrics-card.test.tsx
 * Purpose: Unit tests for QualityMetricsCard component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/llm-quality-types', () => ({}))

import { QualityMetricsCard } from '@/components/llm/QualityMetricsCard'

const mockMetrics = {
  coherenceScore: 0.85,
  relevanceScore: 0.72,
  consistencyScore: 0.91,
  verbosityRatio: 1.3,
  responseLatencyMs: 450,
  tokenCount: 256,
}

describe('QualityMetricsCard', () => {
  it('renders nothing when no metrics or comparison provided', () => {
    const { container } = render(<QualityMetricsCard />)
    expect(container.firstChild).toBeNull()
  })

  it('renders without crashing with metrics', () => {
    const { container } = render(<QualityMetricsCard metrics={mockMetrics as never} />)
    expect(container).toBeTruthy()
  })

  it('displays the Quality Metrics heading', () => {
    render(<QualityMetricsCard metrics={mockMetrics as never} />)
    expect(screen.getByText('Quality Metrics')).toBeInTheDocument()
  })

  it('displays metric labels', () => {
    render(<QualityMetricsCard metrics={mockMetrics as never} />)
    expect(screen.getByText('Coherence')).toBeInTheDocument()
    expect(screen.getByText('Relevance')).toBeInTheDocument()
    expect(screen.getByText('Consistency')).toBeInTheDocument()
  })

  it('displays verbosity and latency values', () => {
    render(<QualityMetricsCard metrics={mockMetrics as never} />)
    expect(screen.getByText('1.3x')).toBeInTheDocument()
    expect(screen.getByText('450ms')).toBeInTheDocument()
  })
})
