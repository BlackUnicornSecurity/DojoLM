/**
 * File: fixture-category-card.test.tsx
 * Purpose: Tests for FixtureCategoryCard component
 * Story: TPI-UIP-10
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

  it('displays clean ratio badge', () => {
    render(
      <FixtureCategoryCard
        name="test"
        category={mockCategory}
        onViewFiles={vi.fn()}
      />
    )
    // 2 clean out of 4 = 50%
    expect(screen.getByText('50% Clean')).toBeTruthy()
  })

  it('displays file count stats', () => {
    render(
      <FixtureCategoryCard
        name="test"
        category={mockCategory}
        onViewFiles={vi.fn()}
      />
    )
    expect(screen.getByText('4 files')).toBeTruthy()
    expect(screen.getByText('2 clean')).toBeTruthy()
    expect(screen.getByText('2 attack')).toBeTruthy()
  })

  it('calls onViewFiles when View Files button clicked', () => {
    const onViewFiles = vi.fn()
    render(
      <FixtureCategoryCard
        name="web"
        category={mockCategory}
        onViewFiles={onViewFiles}
      />
    )
    fireEvent.click(screen.getByText('View Files'))
    expect(onViewFiles).toHaveBeenCalledWith('web')
  })

  it('has proper aria-label on View Files button', () => {
    render(
      <FixtureCategoryCard
        name="dos"
        category={mockCategory}
        onViewFiles={vi.fn()}
      />
    )
    expect(screen.getByLabelText('View files in dos')).toBeTruthy()
  })

  it('renders green badge for >90% clean ratio', () => {
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
    expect(screen.getByText('100% Clean')).toBeTruthy()
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
    expect(screen.getByText('0 files')).toBeTruthy()
    expect(screen.getByText('100% Clean')).toBeTruthy()
  })
})
