/**
 * File: family-tree-view.test.tsx
 * Purpose: Unit tests for FamilyTreeView component
 * Story: S76 - AttackDNA Explorer
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(prop)}`} {...props} />
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: Record<string, unknown>) => <h3 {...props}>{children}</h3>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: Record<string, unknown>) => <div>{children}</div>,
  SelectContent: ({ children }: Record<string, unknown>) => <div>{children}</div>,
  SelectItem: ({ children, ...props }: Record<string, unknown>) => <option {...props}>{children}</option>,
  SelectTrigger: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
  SelectValue: (props: Record<string, unknown>) => <span {...props} />,
}))

vi.mock('./NodeDetailPanel', () => ({
  NodeDetailPanel: () => <div data-testid="node-detail-panel" />,
}))

import { FamilyTreeView } from '@/components/attackdna/FamilyTreeView'

describe('FamilyTreeView', () => {
  it('renders without crashing', () => {
    const { container } = render(<FamilyTreeView />)
    expect(container).toBeTruthy()
  })

  it('displays the default family name', () => {
    render(<FamilyTreeView />)
    expect(screen.getByText('Prompt Injection Alpha')).toBeInTheDocument()
  })

  it('displays the family label', () => {
    render(<FamilyTreeView />)
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('renders tree with role="tree" attribute', () => {
    render(<FamilyTreeView />)
    expect(screen.getByRole('tree')).toBeInTheDocument()
  })

  it('renders zoom controls with zoom in/out/reset labels', () => {
    render(<FamilyTreeView />)
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
    expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument()
  })
})
