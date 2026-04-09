import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))
vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))

import { BeltLegend } from '../ui/BeltLegend'

describe('BeltLegend', () => {
  it('renders all 7 belt tiers', () => {
    render(<BeltLegend />)
    expect(screen.getByText('Black')).toBeInTheDocument()
    expect(screen.getByText('Brown')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
    expect(screen.getByText('Green')).toBeInTheDocument()
    expect(screen.getByText('Orange')).toBeInTheDocument()
    expect(screen.getByText('Yellow')).toBeInTheDocument()
    expect(screen.getByText('White')).toBeInTheDocument()
  })

  it('renders the heading text', () => {
    render(<BeltLegend />)
    expect(screen.getByText('BELT RANKS')).toBeInTheDocument()
  })

  it('has an accessible region role and label', () => {
    render(<BeltLegend />)
    expect(screen.getByRole('region', { name: 'Belt rank legend' })).toBeInTheDocument()
  })

  it('displays score ranges for each tier', () => {
    render(<BeltLegend />)
    expect(screen.getByText('93-100')).toBeInTheDocument()
    expect(screen.getByText('0-20')).toBeInTheDocument()
    expect(screen.getByText('61-75')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<BeltLegend className="my-custom" />)
    const region = container.firstChild as HTMLElement
    expect(region.className).toContain('my-custom')
  })
})
