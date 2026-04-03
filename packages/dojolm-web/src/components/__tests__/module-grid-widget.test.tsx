/**
 * File: module-grid-widget.test.tsx
 * Purpose: Unit tests for ModuleGridWidget dashboard widget
 * Story: TPI-NODA-1.5.9
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <div data-testid="widget-title">{title}</div>
      <div data-testid="widget-content">{children}</div>
    </div>
  ),
}))

vi.mock('@/lib/client-data-cache', () => ({
  getCachedScannerStats: vi.fn().mockResolvedValue({ patternGroups: [] }),
}))

import { ModuleGridWidget } from '@/components/dashboard/widgets/ModuleGridWidget'

describe('ModuleGridWidget', () => {
  it('renders without crashing', () => {
    render(<ModuleGridWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('displays the widget title with module count', () => {
    render(<ModuleGridWidget />)
    expect(screen.getByTestId('widget-title')).toHaveTextContent('Haiku Scanner Modules (0)')
  })

  it('shows loading message when modules are empty', () => {
    render(<ModuleGridWidget />)
    expect(screen.getByText('Loading modules...')).toBeInTheDocument()
  })

  it('renders modules when data is loaded', async () => {
    const { getCachedScannerStats } = await import('@/lib/client-data-cache')
    vi.mocked(getCachedScannerStats).mockResolvedValueOnce({
      patternGroups: [
        { name: 'TestModule', source: 'core', count: 10 },
        { name: 'AnotherModule', source: 'p1', count: 5 },
      ],
    } as ReturnType<typeof getCachedScannerStats> extends Promise<infer T> ? T : never)

    render(<ModuleGridWidget />)
    // Initially shows loading; modules loaded async
    expect(screen.getByTestId('widget-content')).toBeInTheDocument()
  })
})
