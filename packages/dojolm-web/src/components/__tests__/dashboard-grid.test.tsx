/**
 * File: dashboard-grid.test.tsx
 * Purpose: Unit tests for DashboardGrid layout components
 * Story: TPI-UI-001-12
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

import { MetricGrid, SplitView, MainPanel, SidePanel, FullWidthRow, WidgetCard } from '@/components/layout/DashboardGrid'

describe('DashboardGrid components', () => {
  it('MetricGrid renders children', () => {
    render(<MetricGrid><span>KPI</span></MetricGrid>)
    expect(screen.getByText('KPI')).toBeInTheDocument()
  })

  it('SplitView renders children', () => {
    render(<SplitView><span>Split</span></SplitView>)
    expect(screen.getByText('Split')).toBeInTheDocument()
  })

  it('MainPanel renders children with correct grid class', () => {
    const { container } = render(<MainPanel><span>Main</span></MainPanel>)
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('lg:col-span-2')
  })

  it('SidePanel renders children with correct grid class', () => {
    const { container } = render(<SidePanel><span>Side</span></SidePanel>)
    expect(screen.getByText('Side')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('lg:col-span-1')
  })

  it('WidgetCard renders title and children', () => {
    render(<WidgetCard title="Test Widget"><span>Widget content</span></WidgetCard>)
    expect(screen.getByText('Test Widget')).toBeInTheDocument()
    expect(screen.getByText('Widget content')).toBeInTheDocument()
  })
})
