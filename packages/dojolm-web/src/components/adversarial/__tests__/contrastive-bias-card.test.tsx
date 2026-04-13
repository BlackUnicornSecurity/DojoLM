/**
 * File: contrastive-bias-card.test.tsx
 * Purpose: Tests for ContrastiveBiasCard
 * Epic: OBLITERATUS (OBL) — T4.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContrastiveBiasCard } from '../ContrastiveBiasCard'

describe('ContrastiveBiasCard', () => {
  it('renders card title', () => {
    render(<ContrastiveBiasCard />)
    expect(screen.getByText('Contrastive Prompt Bias')).toBeDefined()
  })

  it('renders behavioral approximation badge', () => {
    render(<ContrastiveBiasCard />)
    expect(screen.getByText('Behavioral Approximation')).toBeDefined()
  })

  it('renders strength slider', () => {
    render(<ContrastiveBiasCard />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeDefined()
  })

  it('renders apply button when onApply provided', () => {
    render(<ContrastiveBiasCard onApply={() => {}} />)
    expect(screen.getByText('Apply Bias')).toBeDefined()
  })

  it('does not render apply button when onApply not provided', () => {
    render(<ContrastiveBiasCard />)
    expect(screen.queryByText('Apply Bias')).toBeNull()
  })

  it('calls onApply with strength value', () => {
    const onApply = vi.fn()
    render(<ContrastiveBiasCard onApply={onApply} />)
    fireEvent.click(screen.getByText('Apply Bias'))
    expect(onApply).toHaveBeenCalledWith(0.5) // Default strength
  })
})
