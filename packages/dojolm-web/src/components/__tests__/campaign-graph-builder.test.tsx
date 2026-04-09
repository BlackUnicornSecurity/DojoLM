/**
 * File: campaign-graph-builder.test.tsx
 * Purpose: Unit tests for CampaignGraphBuilder component
 * Story: DAITENGUYAMA D4.5
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: Record<string, unknown>) => <h3 {...props}>{children}</h3>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: Record<string, unknown>) => <div>{children}</div>,
  SelectContent: ({ children }: Record<string, unknown>) => <div>{children}</div>,
  SelectItem: ({ children }: Record<string, unknown>) => <option>{children}</option>,
  SelectTrigger: ({ children }: Record<string, unknown>) => <button>{children}</button>,
  SelectValue: () => <span />,
}))

vi.mock('@/lib/sengoku-types', () => ({
  ALL_SKILLS: [
    { id: 'skill-1', name: 'Recon', category: 'recon', description: 'Reconnaissance' },
    { id: 'skill-2', name: 'Scan', category: 'scan', description: 'Scanning' },
  ],
  GRAPH_TEMPLATES: [
    { id: 'quick-recon', name: 'Quick Recon', nodes: [{ skillId: 'skill-1', order: 0, onFailGoTo: null }] },
  ],
}))

import { CampaignGraphBuilder } from '@/components/sengoku/CampaignGraphBuilder'

describe('CampaignGraphBuilder', () => {
  it('renders without crashing', () => {
    const { container } = render(<CampaignGraphBuilder />)
    expect(container).toBeTruthy()
  })

  it('displays Campaign Graph Builder title', () => {
    render(<CampaignGraphBuilder />)
    expect(screen.getByText('Campaign Graph Builder')).toBeInTheDocument()
  })

  it('displays the skill count badge', () => {
    render(<CampaignGraphBuilder />)
    expect(screen.getByText('0 skills')).toBeInTheDocument()
  })

  it('displays empty state message', () => {
    render(<CampaignGraphBuilder />)
    expect(screen.getByText(/No skills added/)).toBeInTheDocument()
  })

  it('renders the Add Skill button', () => {
    render(<CampaignGraphBuilder />)
    expect(screen.getByText('Add Skill')).toBeInTheDocument()
  })
})
