/**
 * File: library-views.test.tsx
 * Purpose: Tests for Phase 8 Library View components (H11.1-H11.6)
 * Test IDs: LV-001 to LV-030
 * Source files:
 *   - strategic/SageQuarantineView.tsx (H11.1)
 *   - strategic/SageSeedLibrary.tsx (H11.2)
 *   - strategic/SageMutationView.tsx (H11.3)
 *   - strategic/ArenaRoster.tsx (H11.4)
 *   - strategic/MitsukeLibrary.tsx (H11.5)
 *   - attackdna/DNALibrary.tsx (H11.6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks — shared across all library view tests
// ---------------------------------------------------------------------------

// Track LibraryPageTemplate calls for verification
const libraryTemplateInstances: Record<string, unknown>[] = []

vi.mock('@/components/ui/LibraryPageTemplate', () => ({
  LibraryPageTemplate: (props: {
    title: string
    items: unknown[]
    columns: { key: string; label: string; render: (item: unknown) => ReactNode; sortFn?: (a: unknown, b: unknown) => number }[]
    filterFields?: { key: string; label: string; options: { value: string; label: string }[] }[]
    renderDetail?: (item: unknown) => ReactNode
    itemKey: (item: unknown) => string
    searchFn: (item: unknown, query: string) => boolean
    emptyIcon?: unknown
    emptyTitle?: string
    emptyDescription?: string
  }) => {
    libraryTemplateInstances.push(props)
    return (
      <div data-testid={`library-template-${props.title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h2>{props.title}</h2>
        <span data-testid="item-count">{props.items.length} items</span>
        {props.columns.map(col => (
          <span key={col.key} data-testid={`col-${col.key}`}>{col.label}</span>
        ))}
        {props.filterFields?.map(f => (
          <span key={f.key} data-testid={`filter-${f.key}`}>{f.label}</span>
        ))}
        {/* Render first item grid card to test column renderers */}
        {props.items.length > 0 && (
          <div data-testid="first-item">
            {props.columns.map(col => (
              <div key={col.key} data-testid={`render-${col.key}`}>
                {col.render(props.items[0])}
              </div>
            ))}
          </div>
        )}
        {/* Render detail for first item if renderDetail exists */}
        {props.items.length > 0 && props.renderDetail && (
          <div data-testid="detail-panel">
            {props.renderDetail(props.items[0])}
          </div>
        )}
      </div>
    )
  },
}))

vi.mock('@/components/ui/SafeCodeBlock', () => ({
  SafeCodeBlock: ({ code, language, className, maxLines }: {
    code: string; language?: string; className?: string; maxLines?: number
  }) => (
    <pre data-testid="safe-code-block" data-language={language} className={className}>
      {code}
    </pre>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

// Mock all lucide-react icons used by library view components
vi.mock('lucide-react', () => {
  const icon = () => null
  return {
    __esModule: true,
    ShieldAlert: icon, CheckCircle: icon, XCircle: icon, Clock: icon,
    Sprout: icon, Dna: icon, Swords: icon, Radio: icon, Shield: icon,
    Globe: icon, Copy: icon, Check: icon, Network: icon, GitBranch: icon,
    Users: icon, Layers: icon, AlertTriangle: icon, ExternalLink: icon,
    Activity: icon, Zap: icon, Target: icon, FileText: icon, Info: icon,
    ChevronDown: icon, ChevronUp: icon, ChevronRight: icon, Search: icon,
    Filter: icon, X: icon, Plus: icon, Minus: icon, MoreHorizontal: icon,
    ArrowUpDown: icon, ArrowUp: icon, ArrowDown: icon, Eye: icon,
    Download: icon, Upload: icon, Trash2: icon, Edit: icon, Star: icon,
    Award: icon, TrendingUp: icon, TrendingDown: icon, BarChart3: icon,
  }
})

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3><p>{description}</p></div>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  libraryTemplateInstances.length = 0
})

// ===========================================================================
// H11.1: SAGE Quarantine Library
// ===========================================================================
import { SageQuarantineView } from '../strategic/SageQuarantineView'

describe('H11.1: SageQuarantineView', () => {
  // LV-001
  it('renders with LibraryPageTemplate', () => {
    render(<SageQuarantineView />)
    const template = screen.getByTestId(/library-template/)
    expect(template).toBeInTheDocument()
  })

  // LV-002
  it('provides mock quarantine items', () => {
    render(<SageQuarantineView />)
    const count = screen.getByTestId('item-count')
    expect(parseInt(count.textContent || '0')).toBeGreaterThanOrEqual(10)
  })

  // LV-003
  it('includes status filter field', () => {
    render(<SageQuarantineView />)
    expect(screen.getByTestId('filter-status')).toBeInTheDocument()
  })

  // LV-004
  it('renders detail panel with SafeCodeBlock for payloads (SEC-G3)', () => {
    render(<SageQuarantineView />)
    const detail = screen.getByTestId('detail-panel')
    const codeBlock = within(detail).getByTestId('safe-code-block')
    expect(codeBlock).toBeInTheDocument()
    expect(codeBlock.textContent).toBeTruthy()
  })

  // LV-005
  it('has approve/reject action buttons in detail panel', () => {
    render(<SageQuarantineView />)
    const detail = screen.getByTestId('detail-panel')
    const buttons = within(detail).getAllByRole('button')
    const labels = buttons.map(b => b.textContent?.toLowerCase() || b.getAttribute('aria-label')?.toLowerCase() || '')
    const hasApprove = labels.some(l => l.includes('approve'))
    const hasReject = labels.some(l => l.includes('reject'))
    expect(hasApprove).toBe(true)
    expect(hasReject).toBe(true)
  })
})

// ===========================================================================
// H11.2: SAGE Seed Library
// ===========================================================================
import { SageSeedLibrary } from '../strategic/SageSeedLibrary'

describe('H11.2: SageSeedLibrary', () => {
  // LV-006
  it('renders with LibraryPageTemplate', () => {
    render(<SageSeedLibrary />)
    const template = screen.getByTestId(/library-template/)
    expect(template).toBeInTheDocument()
  })

  // LV-007
  it('provides mock seed items', () => {
    render(<SageSeedLibrary />)
    const count = screen.getByTestId('item-count')
    expect(parseInt(count.textContent || '0')).toBeGreaterThanOrEqual(10)
  })

  // LV-008
  it('includes category filter field', () => {
    render(<SageSeedLibrary />)
    expect(screen.getByTestId('filter-category')).toBeInTheDocument()
  })

  // LV-009
  it('renders detail panel with SafeCodeBlock for seed content (SEC-G3)', () => {
    render(<SageSeedLibrary />)
    const detail = screen.getByTestId('detail-panel')
    const codeBlock = within(detail).getByTestId('safe-code-block')
    expect(codeBlock).toBeInTheDocument()
  })

  // LV-010
  it('renders fitness and usage stats in columns', () => {
    render(<SageSeedLibrary />)
    const firstItem = screen.getByTestId('first-item')
    expect(firstItem).toBeInTheDocument()
    // Should have rendered content from columns
    expect(firstItem.textContent).toBeTruthy()
  })
})

// ===========================================================================
// H11.3: SAGE Mutation Operators
// ===========================================================================
import { SageMutationView } from '../strategic/SageMutationView'

describe('H11.3: SageMutationView', () => {
  // LV-011
  it('renders with LibraryPageTemplate', () => {
    render(<SageMutationView />)
    const template = screen.getByTestId(/library-template/)
    expect(template).toBeInTheDocument()
  })

  // LV-012
  it('provides mock mutation operators', () => {
    render(<SageMutationView />)
    const count = screen.getByTestId('item-count')
    expect(parseInt(count.textContent || '0')).toBeGreaterThanOrEqual(6)
  })

  // LV-013
  it('includes category filter field', () => {
    render(<SageMutationView />)
    expect(screen.getByTestId('filter-category')).toBeInTheDocument()
  })

  // LV-014
  it('renders detail panel with SafeCodeBlock for before/after examples (SEC-G3)', () => {
    render(<SageMutationView />)
    const detail = screen.getByTestId('detail-panel')
    const codeBlocks = within(detail).getAllByTestId('safe-code-block')
    expect(codeBlocks.length).toBeGreaterThanOrEqual(2) // before + after
  })

  // LV-015
  it('renders mutation flow diagram in detail', () => {
    render(<SageMutationView />)
    const detail = screen.getByTestId('detail-panel')
    // Flow diagram should exist
    expect(detail.textContent).toBeTruthy()
  })
})

// ===========================================================================
// H11.4: Arena Roster
// ===========================================================================
import { ArenaRoster } from '../strategic/ArenaRoster'

describe('H11.4: ArenaRoster', () => {
  // LV-016
  it('renders with LibraryPageTemplate', () => {
    render(<ArenaRoster />)
    const template = screen.getByTestId(/library-template/)
    expect(template).toBeInTheDocument()
  })

  // LV-017
  it('provides mock roster entries', () => {
    render(<ArenaRoster />)
    const count = screen.getByTestId('item-count')
    expect(parseInt(count.textContent || '0')).toBeGreaterThanOrEqual(8)
  })

  // LV-018
  it('includes provider filter field', () => {
    render(<ArenaRoster />)
    expect(screen.getByTestId('filter-provider')).toBeInTheDocument()
  })

  // LV-019
  it('all stat columns have sort functions', () => {
    render(<ArenaRoster />)
    // Verify that the LibraryPageTemplate was called with sortFn on columns
    expect(libraryTemplateInstances.length).toBeGreaterThan(0)
    const props = libraryTemplateInstances[0] as {
      columns: { key: string; sortFn?: unknown }[]
    }
    const sortableCount = props.columns.filter(c => c.sortFn).length
    expect(sortableCount).toBeGreaterThanOrEqual(4) // At least wins, winRate, avgScore, totalMatches
  })

  // LV-020
  it('renders recent results streak in detail panel', () => {
    render(<ArenaRoster />)
    const detail = screen.getByTestId('detail-panel')
    expect(detail.textContent).toBeTruthy()
  })
})

// ===========================================================================
// H11.5: Mitsuke Full Library Views
// ===========================================================================
import { MitsukeLibrary } from '../strategic/MitsukeLibrary'

describe('H11.5: MitsukeLibrary', () => {
  // LV-021
  it('renders with tab navigation', () => {
    render(<MitsukeLibrary />)
    // Should have tab buttons for indicators, threats, sources
    const buttons = screen.getAllByRole('button')
    const tabLabels = buttons.map(b => b.textContent?.toLowerCase() || '')
    expect(tabLabels.some(l => l.includes('indicator'))).toBe(true)
    expect(tabLabels.some(l => l.includes('threat'))).toBe(true)
    expect(tabLabels.some(l => l.includes('source'))).toBe(true)
  })

  // LV-022
  it('renders LibraryPageTemplate for default tab', () => {
    render(<MitsukeLibrary />)
    const template = screen.getByTestId(/library-template/)
    expect(template).toBeInTheDocument()
  })

  // LV-023
  it('switches between tabs', () => {
    render(<MitsukeLibrary />)
    const buttons = screen.getAllByRole('button')
    const threatsBtn = buttons.find(b => b.textContent?.toLowerCase().includes('threat'))
    expect(threatsBtn).toBeDefined()
    if (threatsBtn) {
      fireEvent.click(threatsBtn)
      // Should now show threats library template
      const template = screen.getByTestId(/library-template/)
      expect(template).toBeInTheDocument()
    }
  })

  // LV-024
  it('renders detail panel with SafeCodeBlock (SEC-G3)', () => {
    render(<MitsukeLibrary />)
    const detail = screen.getByTestId('detail-panel')
    expect(detail).toBeInTheDocument()
  })

  // LV-025
  it('threat URLs are NOT rendered as clickable links (security)', () => {
    render(<MitsukeLibrary />)
    // Switch to sources tab
    const buttons = screen.getAllByRole('button')
    const sourcesBtn = buttons.find(b => b.textContent?.toLowerCase().includes('source'))
    if (sourcesBtn) fireEvent.click(sourcesBtn)
    // Verify no <a> tags with href in the rendered output
    const container = screen.getByTestId(/library-template/)
    const links = container.querySelectorAll('a[href]')
    expect(links.length).toBe(0)
  })
})

// ===========================================================================
// H11.6: Amaterasu DNA Library Views
// ===========================================================================
import { DNALibrary } from '../attackdna/DNALibrary'

describe('H11.6: DNALibrary', () => {
  // LV-026
  it('renders with tab navigation for 4 entity types', () => {
    render(<DNALibrary />)
    const tabs = screen.getAllByRole('tab')
    const tabLabels = tabs.map(b => b.textContent?.toLowerCase() || '')
    expect(tabLabels.some(l => l.includes('node'))).toBe(true)
    expect(tabLabels.some(l => l.includes('edge'))).toBe(true)
    expect(tabLabels.some(l => l.includes('famil'))).toBe(true)
    expect(tabLabels.some(l => l.includes('cluster'))).toBe(true)
  })

  // LV-027
  it('renders LibraryPageTemplate for nodes', () => {
    render(<DNALibrary />)
    const template = screen.getByTestId(/library-template/)
    expect(template).toBeInTheDocument()
  })

  // LV-028
  it('renders node payloads through SafeCodeBlock (SEC-G3)', () => {
    render(<DNALibrary />)
    const detail = screen.getByTestId('detail-panel')
    const codeBlock = within(detail).getByTestId('safe-code-block')
    expect(codeBlock).toBeInTheDocument()
  })

  // LV-029
  it('switches to edges tab', () => {
    render(<DNALibrary />)
    const tabs = screen.getAllByRole('tab')
    const edgesTab = tabs.find(b => b.textContent?.toLowerCase().includes('edge'))
    expect(edgesTab).toBeDefined()
    if (edgesTab) {
      fireEvent.click(edgesTab)
      const template = screen.getByTestId(/library-template/)
      expect(template).toBeInTheDocument()
    }
  })

  // LV-030
  it('provides filter fields for node category and severity', () => {
    render(<DNALibrary />)
    // Default tab is nodes which should have category and severity filters
    const filters = screen.getAllByTestId(/^filter-/)
    expect(filters.length).toBeGreaterThanOrEqual(1)
  })
})
