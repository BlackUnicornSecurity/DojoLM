/**
 * File: model-lab.test.tsx
 * Purpose: Unit tests for ModelLab component
 * Test IDs: ML-001 to ML-004
 * Story: 5.1.1 — wire JutsuTab.onNavigateToTests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigateTo = vi.fn()

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: mockNavigateTo }),
}))

vi.mock('lucide-react', () => ({
  Brain: () => <svg data-testid="brain-icon" />,
  GitCompare: () => <svg data-testid="git-compare-icon" />,
  Wrench: () => <svg data-testid="wrench-icon" />,
  ScrollText: () => <svg data-testid="scroll-text-icon" />,
  Crosshair: () => <svg data-testid="crosshair-icon" />,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => (
    <button role="tab" data-value={value} onClick={() => {
      // Find parent Tabs onValueChange — use event bubbling via custom event
      const el = document.querySelector('[data-testid="tabs"]')
      el?.dispatchEvent(new CustomEvent('tab-change', { detail: value, bubbles: true }))
    }}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}))

// Capture onNavigateToTests so ML-003 can call it
let capturedOnNavigateToTests: (() => void) | undefined
vi.mock('@/components/llm/JutsuTab', () => ({
  JutsuTab: ({ onNavigateToTests }: { onNavigateToTests?: () => void }) => {
    capturedOnNavigateToTests = onNavigateToTests
    return (
      <div data-testid="jutsu-tab">
        <button data-testid="jutsu-run-test-btn" onClick={onNavigateToTests}>
          Run Tests
        </button>
      </div>
    )
  },
}))

vi.mock('@/components/llm/ModelList', () => ({
  ModelList: () => <div data-testid="model-list" />,
}))

vi.mock('@/components/llm/ComparisonView', () => ({
  ComparisonView: () => <div data-testid="comparison-view" />,
}))

vi.mock('@/components/llm/CustomProviderBuilder', () => ({
  CustomProviderBuilder: () => <div data-testid="custom-provider-builder" />,
}))

vi.mock('@/components/llm/ReportGenerator', () => ({
  ReportGenerator: () => <div data-testid="report-generator" />,
}))

vi.mock('@/lib/contexts', () => ({
  LLMModelProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  LLMExecutionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  LLMResultsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/reports/ConsolidatedReportButton', () => ({
  ConsolidatedReportButton: () => <div data-testid="consolidated-report-btn" />,
}))

vi.mock('@/components/guard', () => ({
  GuardBadge: () => <div data-testid="guard-badge" />,
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title }: { title: string }) => <div data-testid="module-header">{title}</div>,
}))

vi.mock('@/components/ui/TestFlowBanner', () => ({
  TestFlowBanner: ({ show, actionLabel, targetNavId }: { show: boolean; message: string; actionLabel: string; targetNavId: string; storageKey: string }) => (
    show ? <div data-testid="test-flow-banner" data-target={targetNavId}>{actionLabel}</div> : null
  ),
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { ModelLab } from '../llm/ModelLab'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModelLab (ML-001 to ML-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnNavigateToTests = undefined
  })

  it('ML-001: renders module header with "Model Lab"', () => {
    render(<ModelLab />)
    expect(screen.getByTestId('module-header')).toHaveTextContent('Model Lab')
  })

  it('ML-002: all four tab triggers are rendered', () => {
    render(<ModelLab />)
    const tabs = screen.getAllByRole('tab')
    const labels = tabs.map((t) => t.textContent)
    expect(labels).toEqual(expect.arrayContaining(['Models', 'Compare', 'Jutsu', 'Custom']))
  })

  it('ML-003: JutsuTab receives onNavigateToTests — calling it navigates to adversarial', () => {
    render(<ModelLab />)
    expect(capturedOnNavigateToTests).toBeDefined()
    capturedOnNavigateToTests?.()
    expect(mockNavigateTo).toHaveBeenCalledWith('adversarial')
  })

  it('ML-004: TestFlowBanner targets adversarial nav', () => {
    render(<ModelLab />)
    const banner = screen.getByTestId('test-flow-banner')
    expect(banner).toHaveAttribute('data-target', 'adversarial')
  })
})
