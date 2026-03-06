/**
 * File: fixture-category-card.test.tsx
 * Purpose: Tests for FixtureCategoryCard component
 * Story: TPI-UIP-10, NODA-3 Story 4.2 (Armory Visual Refresh)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FixtureCategoryCard } from '@/components/fixtures/FixtureCategoryCard'

const mockCategory = {
  story: 'S01',
  desc: 'Test category description',
  files: [
    { file: 'clean1.txt', attack: null, severity: null, clean: true },
    { file: 'clean2.txt', attack: null, severity: null, clean: true },
    { file: 'attack1.txt', attack: 'Prompt injection', severity: 'CRITICAL' as const, clean: false },
    { file: 'attack2.txt', attack: 'Jailbreak', severity: 'WARNING' as const, clean: false },
  ],
}

describe('FixtureCategoryCard', () => {
  it('renders category name and description', () => {
    render(
      <FixtureCategoryCard
        name="prompt-injection"
        category={mockCategory}
        onViewFiles={vi.fn()}
      />
    )
    expect(screen.getByText('prompt-injection')).toBeTruthy()
    expect(screen.getByText('Test category description')).toBeTruthy()
  })

  it('displays fixture count badge', () => {
    render(
      <FixtureCategoryCard
        name="test"
        category={mockCategory}
        onViewFiles={vi.fn()}
      />
    )
    // Total file count shown in badge
    expect(screen.getByText('4')).toBeTruthy()
  })

  it('displays severity distribution legend', () => {
    render(
      <FixtureCategoryCard
        name="test"
        category={mockCategory}
        onViewFiles={vi.fn()}
      />
    )
    // Severity legend shows clean count
    expect(screen.getByText('2 clean')).toBeTruthy()
    // Critical and warning counts shown in legend
    expect(screen.getByText('1 crit')).toBeTruthy()
    expect(screen.getByText('1 warn')).toBeTruthy()
  })

  it('calls onViewFiles when View button clicked', () => {
    const onViewFiles = vi.fn()
    render(
      <FixtureCategoryCard
        name="web"
        category={mockCategory}
        onViewFiles={onViewFiles}
      />
    )
    fireEvent.click(screen.getByText('View'))
    expect(onViewFiles).toHaveBeenCalledWith('web')
  })

  it('has proper aria-label on View button', () => {
    render(
      <FixtureCategoryCard
        name="dos"
        category={mockCategory}
        onViewFiles={vi.fn()}
      />
    )
    expect(screen.getByLabelText('View files in dos')).toBeTruthy()
  })

  it('renders severity aria-label for distribution bar', () => {
    const cleanCategory = {
      story: 'S01',
      desc: 'Clean category',
      files: [
        ...Array.from({ length: 10 }, (_, i) => ({ file: `clean${i}.txt`, attack: null, severity: null, clean: true })),
      ],
    }
    render(
      <FixtureCategoryCard
        name="clean"
        category={cleanCategory}
        onViewFiles={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Severity: 0 critical, 0 warning, 0 info, 10 clean')).toBeTruthy()
  })

  it('handles empty category gracefully', () => {
    const emptyCategory = { story: 'S01', desc: 'Empty', files: [] }
    render(
      <FixtureCategoryCard
        name="empty"
        category={emptyCategory}
        onViewFiles={vi.fn()}
      />
    )
    expect(screen.getByText('0')).toBeTruthy()
    expect(screen.getByText('0 clean')).toBeTruthy()
  })
})
