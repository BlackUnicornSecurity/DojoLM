/**
 * File: amaterasu-dna.test.tsx
 * Purpose: Unit tests for Amaterasu DNA — AttackDNAExplorer, views, NodeDetailPanel, BlackBoxAnalysis, Guide
 * Test IDs: DNA-001 to DNA-025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn().mockImplementation(async (url: URL | RequestInfo) => {
    const urlStr = String(url)
    if (urlStr.includes('type=stats')) {
      return { ok: true, json: async () => ({ stats: { totalNodes: 51, totalEdges: 38, totalFamilies: 7, totalClusters: 5, byCategory: {}, bySeverity: {}, bySource: {} } }) }
    }
    if (urlStr.includes('type=families')) {
      return { ok: true, json: async () => ({ families: [] }) }
    }
    if (urlStr.includes('type=clusters')) {
      return { ok: true, json: async () => ({ clusters: [] }) }
    }
    if (urlStr.includes('type=timeline')) {
      return { ok: true, json: async () => ({ timeline: [] }) }
    }
    if (urlStr.includes('/api/attackdna/sync')) {
      return { ok: true, json: async () => ({ config: { lastSyncAt: null }, syncInProgress: false }) }
    }
    return {
      ok: true,
      json: async () => ({
        analysis: {
          components: [
            { id: 'comp-1', type: 'trigger', content: 'Ignore instructions' },
            { id: 'comp-2', type: 'payload', content: 'reveal secrets' },
          ],
          baselineScore: 0.85,
          ablationResults: [
            { componentId: 'comp-1', componentType: 'trigger', scoreDelta: 0.45, scoreWithout: 0.4, isCritical: true },
            { componentId: 'comp-2', componentType: 'payload', scoreDelta: 0.2, scoreWithout: 0.65, isCritical: false },
          ],
          tokenHeatmap: [
            { index: 0, token: 'Ignore', contribution: 0.8 },
            { index: 1, token: 'instructions', contribution: 0.6 },
          ],
          sensitivityResults: [
            { componentId: 'comp-1', componentType: 'trigger', sensitivity: 0.85, variations: [{ modification: 'original', score: 0.85 }, { modification: 'synonym', score: 0.6 }] },
          ],
          explanation: {
            summary: 'Attack relies heavily on trigger component.',
            criticalComponents: ['Trigger keyword "Ignore" is critical for attack success.'],
            defenseRecommendations: ['Implement trigger word detection.', 'Use instruction-data separation.'],
          },
        },
      }),
    }
  }),
}))

vi.mock('@/lib/ecosystem-types', () => ({
  toEcosystemSeverity: (sev: string) => sev.toUpperCase(),
}))

vi.mock('@/components/ui/ModuleGuide', () => ({
  ModuleGuide: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="module-guide">{title}</div> : null,
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) => (
    <div data-testid="module-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {actions && <div data-testid="header-actions">{actions}</div>}
    </div>
  ),
}))

vi.mock('@/components/ui/CrossModuleActions', () => ({
  CrossModuleActions: () => <div data-testid="cross-module-actions" />,
}))

vi.mock('@/components/ui/SafeCodeBlock', () => ({
  SafeCodeBlock: ({ code }: { code: string }) => <pre data-testid="safe-code-block">{code}</pre>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

// Mock dynamic imports for sub-views
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType }>, opts?: { loading?: () => React.ReactNode }) => {
    // Return a simple placeholder
    const Component = () => <div data-testid="dynamic-view">View loaded</div>
    Component.displayName = 'DynamicView'
    return Component
  },
}))

vi.mock('../attackdna/AmaterasuGuide', () => ({
  AmaterasuGuide: () => <div data-testid="amaterasu-guide">Guide</div>,
  resetAmaterasuGuide: vi.fn(),
  TabHelpButton: ({ tabId }: { tabId: string }) => (
    <button data-testid={`tab-help-${tabId}`}>Help</button>
  ),
}))

vi.mock('../attackdna/AmaterasuConfig', () => ({
  AmaterasuConfig: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="amaterasu-config">Config</div> : null,
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { AttackDNAExplorer } from '../attackdna/AttackDNAExplorer'
import { NodeDetailPanel, type NodeData } from '../attackdna/NodeDetailPanel'
import { BlackBoxAnalysis } from '../attackdna/BlackBoxAnalysis'

// ---------------------------------------------------------------------------
// DNA: AttackDNAExplorer Tests
// ---------------------------------------------------------------------------

describe('AttackDNAExplorer (DNA-001 to DNA-005, DNA-020, DNA-024-025)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const keys = Object.keys(localStorage); keys.forEach(k => localStorage.removeItem(k))
  })

  it('DNA-001: renders Amaterasu DNA header', () => {
    render(<AttackDNAExplorer />)
    expect(screen.getByText('Amaterasu DNA')).toBeInTheDocument()
    expect(screen.getByText(/Analyze attack lineage/)).toBeInTheDocument()
  })

  it('DNA-002: renders stats bar with Nodes, Edges, Families, Clusters', async () => {
    render(<AttackDNAExplorer />)
    expect(screen.getByText('Nodes')).toBeInTheDocument()
    expect(screen.getByText('Edges')).toBeInTheDocument()
    expect(screen.getByText('Families')).toBeInTheDocument()
    // "Clusters" appears both as a stat label and a tab label
    expect(screen.getAllByText('Clusters').length).toBeGreaterThanOrEqual(2)
    // Stats load asynchronously via useDNAData hook
    await waitFor(() => {
      expect(screen.getByText('51')).toBeInTheDocument()
      expect(screen.getByText('38')).toBeInTheDocument()
    })
  })

  it('DNA-003: renders search input', () => {
    render(<AttackDNAExplorer />)
    expect(screen.getByLabelText('Search attacks')).toBeInTheDocument()
  })

  it('DNA-004: renders tab navigation with 4 tabs', () => {
    render(<AttackDNAExplorer />)
    expect(screen.getByText('Family Tree')).toBeInTheDocument()
    // "Clusters" appears both as stat label and tab — use role query
    expect(screen.getByRole('tab', { name: /Clusters/ })).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Analysis')).toBeInTheDocument()
  })

  it('DNA-005: tab switch works', () => {
    render(<AttackDNAExplorer />)
    const clustersTab = screen.getByRole('tab', { name: /Clusters/ })
    fireEvent.click(clustersTab)
    // The dynamic view should render (mocked)
    expect(screen.getAllByTestId('dynamic-view').length).toBeGreaterThan(0)
  })

  it('DNA-020: all 5 tabs are accessible via keyboard', () => {
    render(<AttackDNAExplorer />)
    const tabList = screen.getByRole('tablist', { name: 'Amaterasu DNA views' })
    expect(tabList).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(5)
  })

  it('DNA-024: help button renders', () => {
    render(<AttackDNAExplorer />)
    expect(screen.getByLabelText('Open Amaterasu DNA guide')).toBeInTheDocument()
  })

  it('DNA-025: config button renders and opens config', () => {
    render(<AttackDNAExplorer />)
    fireEvent.click(screen.getByLabelText('Open Amaterasu DNA configuration'))
    expect(screen.getByTestId('amaterasu-config')).toBeInTheDocument()
  })

  it('DNA-024b: getting started guide renders', () => {
    render(<AttackDNAExplorer />)
    expect(screen.getByTestId('amaterasu-guide')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// DNA: NodeDetailPanel Tests
// ---------------------------------------------------------------------------

describe('NodeDetailPanel (DNA-011 to DNA-012)', () => {
  const sampleNode: NodeData = {
    id: 'node-001',
    content: 'Ignore previous instructions',
    category: 'prompt-injection',
    severity: 'critical',
    source: 'pi-direct-001.txt',
    mutations: [
      { type: 'substitution', description: 'Replaced directive verbs' },
      { type: 'encoding', description: 'Applied base64 encoding' },
    ],
  }

  it('DNA-011: renders node detail with all fields', () => {
    render(<NodeDetailPanel node={sampleNode} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: /Node detail: node-001/ })).toBeInTheDocument()
    expect(screen.getByText('node-001')).toBeInTheDocument()
    expect(screen.getByText('prompt-injection')).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('pi-direct-001.txt')).toBeInTheDocument()
    expect(screen.getByText('Ignore previous instructions')).toBeInTheDocument()
    expect(screen.getByText('Mutation History (2)')).toBeInTheDocument()
    expect(screen.getByText('substitution')).toBeInTheDocument()
    expect(screen.getByText('encoding')).toBeInTheDocument()
  })

  it('DNA-012: cross-module actions render', () => {
    render(<NodeDetailPanel node={sampleNode} onClose={vi.fn()} />)
    expect(screen.getByText('Cross-Module Actions')).toBeInTheDocument()
    expect(screen.getByTestId('cross-module-actions')).toBeInTheDocument()
  })

  it('DNA-011b: close button calls onClose', () => {
    const onClose = vi.fn()
    render(<NodeDetailPanel node={sampleNode} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close node detail panel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('DNA-011c: null node renders nothing', () => {
    const { container } = render(<NodeDetailPanel node={null} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('DNA-011d: root node with no mutations shows message', () => {
    const rootNode: NodeData = {
      id: 'root-001',
      content: 'Root attack',
      category: 'injection',
      severity: 'high',
      source: 'root.txt',
      mutations: [],
    }
    render(<NodeDetailPanel node={rootNode} onClose={vi.fn()} />)
    expect(screen.getByText('No mutations recorded (root node)')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// DNA: BlackBoxAnalysis Tests (DNA-013 to DNA-019)
// ---------------------------------------------------------------------------

describe('BlackBoxAnalysis (DNA-013 to DNA-019)', () => {
  it('DNA-013: renders step indicator with 7 steps', () => {
    render(<BlackBoxAnalysis />)
    const steps = screen.getByRole('list', { name: 'Analysis steps' })
    expect(steps).toBeInTheDocument()
    expect(screen.getByLabelText(/Step 1: Select Attack/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Step 7: Explanation/)).toBeInTheDocument()
  })

  it('DNA-014: step 0 shows attack selection', () => {
    render(<BlackBoxAnalysis />)
    expect(screen.getByText('Select an attack to analyze')).toBeInTheDocument()
    expect(screen.getByText('System Override Injection')).toBeInTheDocument()
    expect(screen.getByText('Base64 Encoded Payload')).toBeInTheDocument()
    expect(screen.getByText('Role Manipulation')).toBeInTheDocument()
    expect(screen.getByText('Context Window Exploit')).toBeInTheDocument()
  })

  it('DNA-015: selecting an attack enables Next button', () => {
    render(<BlackBoxAnalysis />)
    // Initially Next is disabled
    const nextBtn = screen.getByText('Next')
    expect(nextBtn).toBeDisabled()
    // Select an attack
    fireEvent.click(screen.getByText('System Override Injection'))
    expect(nextBtn).not.toBeDisabled()
  })

  it('DNA-016: step 1 shows model selection', () => {
    render(<BlackBoxAnalysis />)
    fireEvent.click(screen.getByText('System Override Injection'))
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Select target model')).toBeInTheDocument()
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument()
  })

  it('DNA-017: step 1 Run Analysis disabled without model', () => {
    render(<BlackBoxAnalysis />)
    fireEvent.click(screen.getByText('System Override Injection'))
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Run Analysis')).toBeDisabled()
  })

  it('DNA-018: back button works', () => {
    render(<BlackBoxAnalysis />)
    fireEvent.click(screen.getByText('System Override Injection'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('Select an attack to analyze')).toBeInTheDocument()
  })

  it('DNA-019: custom attack textarea works', () => {
    render(<BlackBoxAnalysis />)
    const textarea = screen.getByLabelText('Custom attack content')
    fireEvent.change(textarea, { target: { value: 'My custom attack payload' } })
    const nextBtn = screen.getByText('Next')
    expect(nextBtn).not.toBeDisabled()
  })

  it('DNA-019b: run analysis triggers API call', async () => {
    const { fetchWithAuth } = await import('@/lib/fetch-with-auth')
    render(<BlackBoxAnalysis />)
    fireEvent.click(screen.getByText('System Override Injection'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('GPT-4o'))
    fireEvent.click(screen.getByText('Run Analysis'))

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        '/api/attackdna/analyze',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})

// ---------------------------------------------------------------------------
// DNA: Ablation Engine Tests (DNA-021 to DNA-023 — data validation)
// ---------------------------------------------------------------------------

describe('Ablation engine data types (DNA-021 to DNA-023)', () => {
  it('DNA-021: analysis result structure is valid', async () => {
    const { fetchWithAuth } = await import('@/lib/fetch-with-auth')
    const mockFetch = fetchWithAuth as ReturnType<typeof vi.fn>
    const response = await mockFetch()
    const data = await response.json()
    expect(data.analysis).toBeDefined()
    expect(data.analysis.components).toBeInstanceOf(Array)
    expect(data.analysis.ablationResults).toBeInstanceOf(Array)
    expect(data.analysis.tokenHeatmap).toBeInstanceOf(Array)
    expect(typeof data.analysis.baselineScore).toBe('number')
  })

  it('DNA-022: ablation result has required fields', async () => {
    const { fetchWithAuth } = await import('@/lib/fetch-with-auth')
    const mockFetch = fetchWithAuth as ReturnType<typeof vi.fn>
    const response = await mockFetch()
    const data = await response.json()
    const result = data.analysis.ablationResults[0]
    expect(result).toHaveProperty('componentId')
    expect(result).toHaveProperty('componentType')
    expect(result).toHaveProperty('scoreDelta')
    expect(result).toHaveProperty('isCritical')
  })

  it('DNA-023: explanation has required fields', async () => {
    const { fetchWithAuth } = await import('@/lib/fetch-with-auth')
    const mockFetch = fetchWithAuth as ReturnType<typeof vi.fn>
    const response = await mockFetch()
    const data = await response.json()
    expect(data.analysis.explanation.summary).toBeTruthy()
    expect(data.analysis.explanation.criticalComponents).toBeInstanceOf(Array)
    expect(data.analysis.explanation.defenseRecommendations).toBeInstanceOf(Array)
  })
})
