/**
 * File: skills-library.test.tsx
 * Purpose: Tests for SkillsLibrary component — rendering, search, filters, reset
 * Story: 12.2b — SkillCard UI + Filter/Search
 * Index:
 * - TC-SKLIB-001: renders library title
 * - TC-SKLIB-002: renders skill count badge
 * - TC-SKLIB-003: search input filters skills
 * - TC-SKLIB-004: toggling filters panel shows category/difficulty/owasp options
 * - TC-SKLIB-005: category filter narrows displayed skills
 * - TC-SKLIB-006: difficulty filter narrows displayed skills
 * - TC-SKLIB-007: OWASP filter narrows displayed skills
 * - TC-SKLIB-008: reset filters restores all skills
 * - TC-SKLIB-009: empty result shows 'no skills match' message
 * - TC-SKLIB-010: applies custom className
 * - TC-SKLIB-011: search input has accessible label
 * - TC-SKLIB-012: filter toggle button has aria-expanded
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock SkillCard to simplify rendering
vi.mock('@/components/adversarial/SkillCard', () => ({
  SkillCard: ({ skill }: { skill: { id: string; name: string } }) => (
    <div data-testid={`skill-card-${skill.id}`}>{skill.name}</div>
  ),
}))

// Mock ALL_SKILLS with a controlled small set
vi.mock('@/lib/adversarial-skills-extended', () => ({
  ALL_SKILLS: [
    {
      id: 'skill-alpha',
      name: 'Alpha Injection',
      description: 'First test skill for injection',
      category: 'injection',
      difficulty: 'beginner',
      owaspMapping: ['LLM01'],
      steps: [],
      tpiStory: 'TPI-01',
      tags: ['injection', 'alpha'],
      approvedTools: [],
      estimatedDurationSec: 10,
    },
    {
      id: 'skill-beta',
      name: 'Beta Evasion',
      description: 'Second test skill for evasion',
      category: 'evasion',
      difficulty: 'advanced',
      owaspMapping: ['LLM02'],
      steps: [],
      tpiStory: 'TPI-02',
      tags: ['evasion', 'beta'],
      approvedTools: [],
      estimatedDurationSec: 20,
    },
    {
      id: 'skill-gamma',
      name: 'Gamma Encoding',
      description: 'Third test skill for encoding',
      category: 'encoding',
      difficulty: 'beginner',
      owaspMapping: ['LLM01', 'LLM03'],
      steps: [],
      tpiStory: 'TPI-03',
      tags: ['encoding', 'gamma'],
      approvedTools: [],
      estimatedDurationSec: 15,
    },
  ],
}))

import { SkillsLibrary } from '@/components/adversarial/SkillsLibrary'

describe('SkillsLibrary', () => {
  it('TC-SKLIB-001: renders library title', () => {
    render(<SkillsLibrary />)
    expect(screen.getByText('Adversarial Skills Library')).toBeInTheDocument()
  })

  it('TC-SKLIB-002: renders skill count badge', () => {
    render(<SkillsLibrary />)
    // 3 / 3 skills when unfiltered
    expect(screen.getByText('3 / 3 skills')).toBeInTheDocument()
  })

  it('TC-SKLIB-003: search input filters skills by name', () => {
    render(<SkillsLibrary />)
    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'Alpha' } })
    expect(screen.getByTestId('skill-card-skill-alpha')).toBeInTheDocument()
    expect(screen.queryByTestId('skill-card-skill-beta')).not.toBeInTheDocument()
    expect(screen.queryByTestId('skill-card-skill-gamma')).not.toBeInTheDocument()
  })

  it('TC-SKLIB-004: toggling filters panel shows category/difficulty/owasp options', () => {
    render(<SkillsLibrary />)
    // Filters not visible initially
    expect(screen.queryByText('Category')).not.toBeInTheDocument()

    const filterBtn = screen.getByRole('button', { name: /show filters/i })
    fireEvent.click(filterBtn)
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Difficulty')).toBeInTheDocument()
    expect(screen.getByText('OWASP LLM')).toBeInTheDocument()
  })

  it('TC-SKLIB-005: category filter narrows displayed skills', () => {
    render(<SkillsLibrary />)
    // Open filters
    fireEvent.click(screen.getByRole('button', { name: /show filters/i }))

    // Click 'Injection' category
    const injectionBtn = screen.getByRole('radio', { name: /injection/i })
    fireEvent.click(injectionBtn)

    expect(screen.getByTestId('skill-card-skill-alpha')).toBeInTheDocument()
    expect(screen.queryByTestId('skill-card-skill-beta')).not.toBeInTheDocument()
  })

  it('TC-SKLIB-006: difficulty filter narrows displayed skills', () => {
    render(<SkillsLibrary />)
    fireEvent.click(screen.getByRole('button', { name: /show filters/i }))

    // Click 'Advanced' difficulty
    const advancedBtn = screen.getByRole('radio', { name: /advanced/i })
    fireEvent.click(advancedBtn)

    expect(screen.getByTestId('skill-card-skill-beta')).toBeInTheDocument()
    expect(screen.queryByTestId('skill-card-skill-alpha')).not.toBeInTheDocument()
  })

  it('TC-SKLIB-007: OWASP filter narrows displayed skills', () => {
    render(<SkillsLibrary />)
    fireEvent.click(screen.getByRole('button', { name: /show filters/i }))

    // Click LLM03 filter
    const llm03Btn = screen.getByRole('radio', { name: /LLM03/i })
    fireEvent.click(llm03Btn)

    // Only gamma has LLM03
    expect(screen.getByTestId('skill-card-skill-gamma')).toBeInTheDocument()
    expect(screen.queryByTestId('skill-card-skill-alpha')).not.toBeInTheDocument()
    expect(screen.queryByTestId('skill-card-skill-beta')).not.toBeInTheDocument()
  })

  it('TC-SKLIB-008: reset filters restores all skills', () => {
    render(<SkillsLibrary />)
    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'nonexistent-skill-xyz' } })
    expect(screen.getByText('No skills match the current filters.')).toBeInTheDocument()

    // Click reset
    const resetBtn = screen.getByRole('button', { name: /reset filters/i })
    fireEvent.click(resetBtn)

    expect(screen.getByTestId('skill-card-skill-alpha')).toBeInTheDocument()
    expect(screen.getByTestId('skill-card-skill-beta')).toBeInTheDocument()
    expect(screen.getByTestId('skill-card-skill-gamma')).toBeInTheDocument()
  })

  it('TC-SKLIB-009: empty result shows no skills match message', () => {
    render(<SkillsLibrary />)
    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'zzz-no-match-zzz' } })
    expect(screen.getByText('No skills match the current filters.')).toBeInTheDocument()
  })

  it('TC-SKLIB-010: applies custom className', () => {
    const { container } = render(<SkillsLibrary className="my-custom-class" />)
    expect((container.firstChild as HTMLElement).className).toContain('my-custom-class')
  })

  it('TC-SKLIB-011: search input has accessible label', () => {
    render(<SkillsLibrary />)
    expect(screen.getByLabelText('Search adversarial skills')).toBeInTheDocument()
  })

  it('TC-SKLIB-012: filter toggle button has aria-expanded', () => {
    render(<SkillsLibrary />)
    const filterBtn = screen.getByRole('button', { name: /show filters/i })
    expect(filterBtn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(filterBtn)
    const hideBtn = screen.getByRole('button', { name: /hide filters/i })
    expect(hideBtn).toHaveAttribute('aria-expanded', 'true')
  })
})
