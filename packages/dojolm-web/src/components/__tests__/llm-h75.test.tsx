/**
 * File: llm-h75.test.tsx
 * Purpose: Tests for H7.5 Compliance Badges on Model Cards
 * Test IDs: H75-001 to H75-007
 * Source: src/components/llm/ModelResultCard.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import type { LLMTestExecution } from '@/lib/llm-types'
import { calculateBadges } from '@/components/llm/ModelResultCard'
import type { AggregatedModelResult } from '@/components/llm/ModelResultCard'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/BeltBadge', () => ({
  BeltBadge: ({ score, size }: { score: number; size: string }) => (
    <span data-testid="belt-badge" data-score={score} data-size={size}>Belt</span>
  ),
  getBeltRank: (score: number) => {
    if (score >= 93) return { label: 'Black Belt', color: '#000', short: 'Black' }
    if (score >= 76) return { label: 'Blue Belt', color: '#00f', short: 'Blue' }
    if (score >= 41) return { label: 'Orange Belt', color: '#f80', short: 'Orange' }
    return { label: 'White Belt', color: '#fff', short: 'White' }
  },
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': label, 'aria-expanded': expanded, className }: any) => (
    <button onClick={onClick} aria-label={label} aria-expanded={expanded} className={className}>{children}</button>
  ),
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} role="progressbar" />
  ),
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExecution(overrides: Partial<LLMTestExecution> = {}): LLMTestExecution {
  return {
    id: 'exec-1',
    testCaseId: 'tc-1',
    modelConfigId: 'model-1',
    timestamp: '2025-01-01T00:00:00Z',
    status: 'completed',
    prompt: 'test prompt',
    response: 'test response',
    duration_ms: 100,
    injectionSuccess: 0,
    harmfulness: 0,
    resilienceScore: 90,
    categoriesPassed: [],
    categoriesFailed: [],
    owaspCoverage: {},
    tpiCoverage: {},
    contentHash: 'hash-1',
    cached: false,
    ...overrides,
  }
}

function makeResult(overrides: Partial<AggregatedModelResult> = {}): AggregatedModelResult {
  return {
    modelId: 'model-1',
    modelName: 'Test Model',
    provider: 'openai',
    latestScore: 85,
    avgScore: 82,
    testCount: 5,
    passedCount: 5,
    failedCount: 0,
    lastTestedAt: '2025-01-01T00:00:00Z',
    executions: [makeExecution()],
    vulnerabilities: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Unit tests: calculateBadges
// ---------------------------------------------------------------------------

describe('calculateBadges', () => {
  it('H75-001: returns OWASP badge when all tested categories pass (>= 5)', () => {
    const result = makeResult({
      executions: [
        makeExecution({
          owaspCoverage: {
            LLM01: true,
            LLM02: true,
            LLM03: true,
            LLM04: true,
            LLM05: true,
          },
        }),
      ],
    })
    const badges = calculateBadges(result)
    const owaspBadge = badges.find(b => b.label === 'OWASP LLM Top 10')
    expect(owaspBadge).toBeDefined()
    expect(owaspBadge!.earned).toBe(true)
    expect(owaspBadge!.color).toBe('#4caf50')
  })

  it('H75-002: does NOT return OWASP badge when coverage is incomplete (< 5 categories)', () => {
    const result = makeResult({
      executions: [
        makeExecution({
          owaspCoverage: {
            LLM01: true,
            LLM02: true,
            LLM03: true,
          },
        }),
      ],
    })
    const badges = calculateBadges(result)
    const owaspBadge = badges.find(b => b.label === 'OWASP LLM Top 10')
    expect(owaspBadge).toBeUndefined()
  })

  it('H75-003: does NOT return OWASP badge when any category fails', () => {
    const result = makeResult({
      executions: [
        makeExecution({
          owaspCoverage: {
            LLM01: true,
            LLM02: true,
            LLM03: false,
            LLM04: true,
            LLM05: true,
          },
        }),
      ],
    })
    const badges = calculateBadges(result)
    const owaspBadge = badges.find(b => b.label === 'OWASP LLM Top 10')
    expect(owaspBadge).toBeUndefined()
  })

  it('H75-004: returns Security Resilient badge when avgScore >= 80 and 0 failures', () => {
    const result = makeResult({
      avgScore: 85,
      failedCount: 0,
    })
    const badges = calculateBadges(result)
    const secBadge = badges.find(b => b.label === 'Security Resilient')
    expect(secBadge).toBeDefined()
    expect(secBadge!.earned).toBe(true)
    expect(secBadge!.color).toBe('#2196f3')
  })

  it('H75-005: does NOT return Security Resilient when there are failures', () => {
    const result = makeResult({
      avgScore: 90,
      failedCount: 1,
    })
    const badges = calculateBadges(result)
    const secBadge = badges.find(b => b.label === 'Security Resilient')
    expect(secBadge).toBeUndefined()
  })

  it('H75-006: does NOT return Security Resilient when avgScore < 80', () => {
    const result = makeResult({
      avgScore: 75,
      failedCount: 0,
    })
    const badges = calculateBadges(result)
    const secBadge = badges.find(b => b.label === 'Security Resilient')
    expect(secBadge).toBeUndefined()
  })

  it('H75-007: returns Thoroughly Tested badge when testCount >= 10', () => {
    const result = makeResult({
      testCount: 12,
    })
    const badges = calculateBadges(result)
    const testedBadge = badges.find(b => b.label === 'Thoroughly Tested')
    expect(testedBadge).toBeDefined()
    expect(testedBadge!.earned).toBe(true)
    expect(testedBadge!.color).toBe('#9c27b0')
  })

  it('H75-008: does NOT return Thoroughly Tested when testCount < 10', () => {
    const result = makeResult({
      testCount: 5,
    })
    const badges = calculateBadges(result)
    const testedBadge = badges.find(b => b.label === 'Thoroughly Tested')
    expect(testedBadge).toBeUndefined()
  })

  it('H75-009: returns multiple badges when all conditions met', () => {
    const result = makeResult({
      avgScore: 90,
      failedCount: 0,
      testCount: 15,
      executions: [
        makeExecution({
          owaspCoverage: {
            LLM01: true,
            LLM02: true,
            LLM03: true,
            LLM04: true,
            LLM05: true,
            LLM06: true,
          },
        }),
      ],
    })
    const badges = calculateBadges(result)
    expect(badges).toHaveLength(3)
    expect(badges.map(b => b.label)).toEqual([
      'OWASP LLM Top 10',
      'Security Resilient',
      'Thoroughly Tested',
    ])
  })

  it('H75-010: returns empty array when no conditions met', () => {
    const result = makeResult({
      avgScore: 40,
      failedCount: 3,
      testCount: 2,
      executions: [makeExecution({ owaspCoverage: {} })],
    })
    const badges = calculateBadges(result)
    expect(badges).toHaveLength(0)
  })

  it('H75-011: OWASP badge aggregates across multiple executions (failure sticky)', () => {
    const result = makeResult({
      executions: [
        makeExecution({
          id: 'exec-1',
          owaspCoverage: { LLM01: true, LLM02: true, LLM03: true },
        }),
        makeExecution({
          id: 'exec-2',
          owaspCoverage: { LLM04: true, LLM05: true, LLM02: false },
        }),
      ],
    })
    const badges = calculateBadges(result)
    // LLM02 failed in second exec, so OWASP badge should NOT be earned
    const owaspBadge = badges.find(b => b.label === 'OWASP LLM Top 10')
    expect(owaspBadge).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Rendering tests
// ---------------------------------------------------------------------------

describe('ModelResultCard badge rendering', () => {
  // Lazy import to ensure mocks are applied
  let ModelResultCard: typeof import('@/components/llm/ModelResultCard').ModelResultCard

  beforeAll(async () => {
    const mod = await import('@/components/llm/ModelResultCard')
    ModelResultCard = mod.ModelResultCard
  })

  it('H75-012: renders badges when earned', () => {
    const result = makeResult({
      avgScore: 90,
      failedCount: 0,
      testCount: 15,
      executions: [
        makeExecution({
          owaspCoverage: {
            LLM01: true,
            LLM02: true,
            LLM03: true,
            LLM04: true,
            LLM05: true,
          },
        }),
      ],
    })
    render(<ModelResultCard result={result} />)
    const badgeContainer = screen.getByTestId('compliance-badges')
    expect(badgeContainer).toBeInTheDocument()
    expect(screen.getByLabelText('Badge: OWASP LLM Top 10')).toBeInTheDocument()
    expect(screen.getByLabelText('Badge: Security Resilient')).toBeInTheDocument()
    expect(screen.getByLabelText('Badge: Thoroughly Tested')).toBeInTheDocument()
  })

  it('H75-013: does NOT render badge container when no badges earned', () => {
    const result = makeResult({
      avgScore: 40,
      failedCount: 3,
      testCount: 2,
      executions: [makeExecution({ owaspCoverage: {} })],
    })
    render(<ModelResultCard result={result} />)
    expect(screen.queryByTestId('compliance-badges')).not.toBeInTheDocument()
  })

  it('H75-014: badges have aria-label for accessibility', () => {
    const result = makeResult({
      avgScore: 85,
      failedCount: 0,
    })
    render(<ModelResultCard result={result} />)
    const badge = screen.getByLabelText('Badge: Security Resilient')
    expect(badge).toBeInTheDocument()
    expect(badge.tagName.toLowerCase()).toBe('span')
  })
})
