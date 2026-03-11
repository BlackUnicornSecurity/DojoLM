/**
 * File: skill-card.test.tsx
 * Purpose: Tests for SkillCard component — rendering, expand/collapse, execute callback, a11y
 * Story: 12.2b — SkillCard UI + Filter/Search
 * Index:
 * - TC-SKCARD-001: renders skill name and description
 * - TC-SKCARD-002: renders category badge
 * - TC-SKCARD-003: renders difficulty badge
 * - TC-SKCARD-004: renders OWASP mapping badges
 * - TC-SKCARD-005: shows step count and estimated duration
 * - TC-SKCARD-006: expand button toggles expanded state
 * - TC-SKCARD-007: shows step details when expanded
 * - TC-SKCARD-008: shows example payload in expanded steps
 * - TC-SKCARD-009: calls onExecute with skill id
 * - TC-SKCARD-010: hides execute button when onExecute is not provided
 * - TC-SKCARD-011: aria-expanded attribute toggles correctly
 * - TC-SKCARD-012: applies custom className
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillCard } from '@/components/adversarial/SkillCard'
import type { AdversarialSkill } from '@/lib/adversarial-skills-types'

// Mock SafeCodeBlock to simplify DOM
vi.mock('@/components/ui/SafeCodeBlock', () => ({
  SafeCodeBlock: ({ code }: { code: string }) => (
    <pre data-testid="safe-code-block">{code}</pre>
  ),
}))

const mockSkill: AdversarialSkill = {
  id: 'test-skill-001',
  name: 'Test Prompt Injection',
  description: 'A test skill for prompt injection attacks',
  category: 'injection',
  difficulty: 'intermediate',
  owaspMapping: ['LLM01', 'LLM06'],
  steps: [
    {
      order: 1,
      label: 'Prepare payload',
      instruction: 'Craft a prompt injection payload',
      examplePayload: 'Ignore previous instructions',
      expectedOutcome: 'Payload is ready',
    },
    {
      order: 2,
      label: 'Send payload',
      instruction: 'Submit the payload to the target model',
      expectedOutcome: 'Model processes the payload',
    },
  ],
  tpiStory: 'TPI-01',
  tags: ['injection', 'prompt'],
  approvedTools: ['scanner'],
  estimatedDurationSec: 30,
}

describe('SkillCard', () => {
  it('TC-SKCARD-001: renders skill name and description', () => {
    render(<SkillCard skill={mockSkill} />)
    expect(screen.getByText('Test Prompt Injection')).toBeInTheDocument()
    expect(screen.getByText('A test skill for prompt injection attacks')).toBeInTheDocument()
  })

  it('TC-SKCARD-002: renders category badge', () => {
    render(<SkillCard skill={mockSkill} />)
    // CATEGORY_CONFIG maps 'injection' -> 'Injection'
    expect(screen.getByText('Injection')).toBeInTheDocument()
  })

  it('TC-SKCARD-003: renders difficulty badge', () => {
    render(<SkillCard skill={mockSkill} />)
    // DIFFICULTY_CONFIG maps 'intermediate' -> 'Intermediate'
    expect(screen.getByText('Intermediate')).toBeInTheDocument()
  })

  it('TC-SKCARD-004: renders OWASP mapping badges', () => {
    render(<SkillCard skill={mockSkill} />)
    expect(screen.getByText('LLM01')).toBeInTheDocument()
    expect(screen.getByText('LLM06')).toBeInTheDocument()
  })

  it('TC-SKCARD-005: shows step count and estimated duration', () => {
    render(<SkillCard skill={mockSkill} />)
    expect(screen.getByText('2 steps')).toBeInTheDocument()
    expect(screen.getByText('~30s')).toBeInTheDocument()
  })

  it('TC-SKCARD-006: expand button toggles expanded state', () => {
    render(<SkillCard skill={mockSkill} />)
    const expandBtn = screen.getByRole('button', { name: /expand skill steps/i })
    expect(expandBtn).toBeInTheDocument()
    expect(screen.getByText('Steps')).toBeInTheDocument()

    fireEvent.click(expandBtn)
    expect(screen.getByText('Collapse')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /collapse skill steps/i }))
    expect(screen.getByText('Steps')).toBeInTheDocument()
  })

  it('TC-SKCARD-007: shows step details when expanded', () => {
    render(<SkillCard skill={mockSkill} />)
    // Steps not visible initially
    expect(screen.queryByText('Prepare payload')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand skill steps/i }))
    expect(screen.getByText('Prepare payload')).toBeInTheDocument()
    expect(screen.getByText('Craft a prompt injection payload')).toBeInTheDocument()
    expect(screen.getByText('Expected: Payload is ready')).toBeInTheDocument()
    expect(screen.getByText('Send payload')).toBeInTheDocument()
  })

  it('TC-SKCARD-008: shows example payload in expanded steps', () => {
    render(<SkillCard skill={mockSkill} />)
    fireEvent.click(screen.getByRole('button', { name: /expand skill steps/i }))
    // Step 1 has an examplePayload, step 2 does not
    const codeBlocks = screen.getAllByTestId('safe-code-block')
    expect(codeBlocks).toHaveLength(1)
    expect(codeBlocks[0]).toHaveTextContent('Ignore previous instructions')
  })

  it('TC-SKCARD-009: calls onExecute with skill id', () => {
    const onExecute = vi.fn()
    render(<SkillCard skill={mockSkill} onExecute={onExecute} />)
    const executeBtn = screen.getByRole('button', { name: /execute test prompt injection/i })
    fireEvent.click(executeBtn)
    expect(onExecute).toHaveBeenCalledTimes(1)
    expect(onExecute).toHaveBeenCalledWith('test-skill-001')
  })

  it('TC-SKCARD-010: hides execute button when onExecute is not provided', () => {
    render(<SkillCard skill={mockSkill} />)
    expect(screen.queryByRole('button', { name: /execute/i })).not.toBeInTheDocument()
  })

  it('TC-SKCARD-011: aria-expanded attribute toggles correctly', () => {
    render(<SkillCard skill={mockSkill} />)
    const expandBtn = screen.getByRole('button', { name: /expand skill steps/i })
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(expandBtn)
    const collapseBtn = screen.getByRole('button', { name: /collapse skill steps/i })
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('TC-SKCARD-012: applies custom className', () => {
    const { container } = render(<SkillCard skill={mockSkill} className="custom-test-class" />)
    // The Card is the outermost rendered element
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('custom-test-class')
  })
})
