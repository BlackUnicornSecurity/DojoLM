/**
 * File: feature-radar.test.tsx
 * Purpose: Unit tests for FeatureRadar component
 * Story: K5.4
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

import { FeatureRadar } from '@/components/kagami/FeatureRadar'

const axes = [
  { label: 'Style', key: 'style' },
  { label: 'Safety', key: 'safety' },
  { label: 'Knowledge', key: 'knowledge' },
]

const targetValues = { style: 0.8, safety: 0.9, knowledge: 0.7 }
const candidateValues = { style: 0.6, safety: 0.85, knowledge: 0.75 }

describe('FeatureRadar', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <FeatureRadar axes={axes} targetValues={targetValues} candidateValues={candidateValues} />
    )
    expect(container).toBeTruthy()
  })

  it('renders an SVG element with role="img"', () => {
    render(
      <FeatureRadar axes={axes} targetValues={targetValues} candidateValues={candidateValues} />
    )
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('displays the default legend labels', () => {
    render(
      <FeatureRadar axes={axes} targetValues={targetValues} candidateValues={candidateValues} />
    )
    expect(screen.getByText('Target')).toBeInTheDocument()
    expect(screen.getByText('Top Candidate')).toBeInTheDocument()
  })

  it('displays custom legend labels', () => {
    render(
      <FeatureRadar
        axes={axes}
        targetValues={targetValues}
        candidateValues={candidateValues}
        targetLabel="Model A"
        candidateLabel="Model B"
      />
    )
    expect(screen.getByText('Model A')).toBeInTheDocument()
    expect(screen.getByText('Model B')).toBeInTheDocument()
  })

  it('renders axis labels', () => {
    render(
      <FeatureRadar axes={axes} targetValues={targetValues} candidateValues={candidateValues} />
    )
    expect(screen.getByText('Style')).toBeInTheDocument()
    expect(screen.getByText('Safety')).toBeInTheDocument()
    expect(screen.getByText('Knowledge')).toBeInTheDocument()
  })
})
