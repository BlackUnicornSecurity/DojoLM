/**
 * File: scanner-insights-panel.test.tsx
 * Purpose: Unit tests for ScannerInsightsPanel mounting hidden scanner surfaces
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createContext, useContext } from 'react'

const TabsContext = createContext<{ value: string; setValue: (value: string) => void } | null>(null)

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange?: (value: string) => void
  }) => (
    <TabsContext.Provider value={{ value, setValue: (nextValue) => onValueChange?.(nextValue) }}>
      <div>{children}</div>
    </TabsContext.Provider>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const context = useContext(TabsContext)

    return (
      <button
        role="tab"
        aria-selected={context?.value === value}
        onClick={() => context?.setValue(value)}
      >
        {children}
      </button>
    )
  },
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const context = useContext(TabsContext)
    if (context?.value !== value) return null
    return <div>{children}</div>
  },
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: { children: React.ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('../scanner/FindingsList', () => ({
  FindingsList: ({ result }: { result: unknown }) => <div data-testid="findings-list">{result ? 'has-results' : 'empty'}</div>,
}))

vi.mock('../scanner/ModuleLegend', () => ({
  ModuleLegend: () => <div data-testid="module-legend">Module Legend</div>,
}))

vi.mock('../scanner/ModuleResults', () => ({
  ModuleResults: () => <div data-testid="module-results">Module Results</div>,
}))

vi.mock('@/components/reference/PatternReference', () => ({
  PatternReference: () => <div data-testid="pattern-reference">Pattern Reference</div>,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}))

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ activeTab: 'scanner', setActiveTab: vi.fn() }),
}))

vi.mock('@/components/ui/TestFlowBanner', () => ({
  TestFlowBanner: () => <div data-testid="test-flow-banner" />,
}))

import { ScannerInsightsPanel } from '../scanner/ScannerInsightsPanel'

function makeResult() {
  return {
    verdict: 'BLOCK' as const,
    findings: [
      {
        category: 'prompt-injection',
        severity: 'CRITICAL' as const,
        description: 'Detected direct override',
        engine: 'mcp-parser',
        pattern_name: 'direct-instruction-override',
        source: 'current' as const,
      },
    ],
    counts: { critical: 1, warning: 0, info: 0 },
    elapsed: 12,
    textLength: 80,
    normalizedLength: 80,
  }
}

describe('ScannerInsightsPanel', () => {
  it('renders findings, modules, and reference tabs', () => {
    render(<ScannerInsightsPanel result={makeResult()} />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByText('Findings')).toBeInTheDocument()
    expect(screen.getByText('Modules')).toBeInTheDocument()
    expect(screen.getByText('Reference')).toBeInTheDocument()
  })

  it('mounts the findings, diagnostics, and reference surfaces together', () => {
    render(<ScannerInsightsPanel result={makeResult()} />)

    expect(screen.getByTestId('findings-list')).toBeInTheDocument()
  })

  it('surfaces workspace cards and switches to module diagnostics', () => {
    render(<ScannerInsightsPanel result={makeResult()} />)

    expect(screen.getByText('Module Diagnostics')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Open Module Diagnostics/i }))

    expect(screen.getByTestId('module-legend')).toBeInTheDocument()
    expect(screen.getByTestId('module-results')).toBeInTheDocument()
  })

  it('opens the pattern reference workspace from the discoverability card', () => {
    render(<ScannerInsightsPanel result={makeResult()} />)

    fireEvent.click(screen.getByRole('button', { name: /Open Pattern Reference/i }))

    expect(screen.getByTestId('pattern-reference')).toBeInTheDocument()
  })

  it('shows an empty diagnostics state when there are no findings', () => {
    render(
      <ScannerInsightsPanel
        result={{
          verdict: 'ALLOW' as const,
          findings: [],
          counts: { critical: 0, warning: 0, info: 0 },
          elapsed: 3,
          textLength: 10,
          normalizedLength: 10,
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Open Module Diagnostics/i }))

    expect(screen.getByTestId('empty-state')).toHaveTextContent('No module diagnostics yet')
  })
})
