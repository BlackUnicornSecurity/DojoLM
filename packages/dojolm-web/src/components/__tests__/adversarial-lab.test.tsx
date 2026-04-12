/**
 * File: adversarial-lab.test.tsx
 * Purpose: Tests for AdversarialLab main component
 * Test IDs: AL-001 to AL-012 (AL-007 updated for H13.2 tabbed UI)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { createContext, useContext, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/lib/contexts/EcosystemContext', () => ({
  useEcosystemEmit: () => ({ emitFinding: vi.fn() }),
}))

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: vi.fn() }),
}))

vi.mock('@/lib/adversarial-skill-engine', () => ({
  executeSkill: vi.fn().mockResolvedValue({
    skillId: 'test-skill',
    success: true,
    severity: 'high',
    summary: 'Test result',
    rawContent: 'raw content',
    durationMs: 100,
    stepResults: [],
  }),
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) => (
    <div data-testid="module-header"><h1>{title}</h1><p>{subtitle}</p>{actions}</div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: { children: ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}))

vi.mock('../adversarial/AttackToolCard', () => ({
  AttackToolCard: ({ name, enabled }: { name: string; enabled: boolean }) => (
    <div data-testid={`attack-tool-${name}`} data-enabled={enabled}>{name}</div>
  ),
}))

vi.mock('../adversarial/AttackLog', () => ({
  AttackLog: () => <div data-testid="attack-log">Attack Log</div>,
}))

vi.mock('../adversarial/AtemiGettingStarted', () => ({
  AtemiGettingStarted: () => <div data-testid="getting-started">Getting Started</div>,
}))

vi.mock('../adversarial/McpConnectorStatus', () => ({
  McpConnectorStatus: ({ connected }: { connected: boolean }) => (
    <div data-testid="mcp-status" data-connected={connected}>MCP Status</div>
  ),
}))

vi.mock('../adversarial/AtemiConfig', () => ({
  AtemiConfig: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="atemi-config"><button onClick={onClose}>Close Config</button></div> : null
  ),
}))

vi.mock('../adversarial/SessionRecorder', () => ({
  SessionRecorder: ({ mode }: { mode: string }) => (
    <div data-testid="session-recorder" data-mode={mode}>Recorder</div>
  ),
}))

vi.mock('../adversarial/SessionHistory', () => ({
  SessionHistory: () => <div data-testid="session-history">Session History</div>,
}))

vi.mock('../adversarial/SkillsLibrary', () => ({
  SkillsLibrary: ({ onExecuteSkill }: { onExecuteSkill: (id: string) => void }) => (
    <div data-testid="skills-library">
      <button onClick={() => onExecuteSkill('test-skill')}>Execute Skill</button>
    </div>
  ),
}))

vi.mock('../adversarial/PlaybookRunner', () => ({
  PlaybookRunner: () => <div data-testid="playbook-runner">Playbooks</div>,
}))

vi.mock('../scanner/ProtocolFuzzPanel', () => ({
  ProtocolFuzzPanel: () => <div data-testid="protocol-fuzz-panel">Protocol Fuzzer</div>,
}))

vi.mock('../agentic/AgenticLab', () => ({
  AgenticLab: () => <div data-testid="agentic-lab">Agentic Security Lab</div>,
}))

const TabsContext = createContext<{ value: string; setValue: (value: string) => void } | null>(null)

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
    ...rest
  }: {
    children: ReactNode
    value: string
    onValueChange?: (value: string) => void
    [k: string]: unknown
  }) => {
    return (
      <TabsContext.Provider
        value={{
          value,
          setValue: (nextValue) => onValueChange?.(nextValue),
        }}
      >
        <div data-testid="tabs-root" data-value={value} {...rest}>{children}</div>
      </TabsContext.Provider>
    )
  },
  TabsList: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => <div role="tablist" {...rest}>{children}</div>,
  TabsTrigger: ({ children, value, ...rest }: { children: ReactNode; value: string; [k: string]: unknown }) => {
    const context = useContext(TabsContext)
    const selected = context?.value === value

    return (
      <button
        role="tab"
        data-value={value}
        aria-selected={selected}
        onClick={() => context?.setValue(value)}
        {...rest}
      >
        {children}
      </button>
    )
  },
  TabsContent: ({ children, value, ...rest }: { children: ReactNode; value: string; [k: string]: unknown }) => {
    const context = useContext(TabsContext)

    if (context?.value !== value) return null

    return (
      <div role="tabpanel" data-testid={`tab-content-${value}`} {...rest}>{children}</div>
    )
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { AdversarialLab } from '../adversarial/AdversarialLab'

// ===========================================================================
// AL-001: Renders header
// ===========================================================================
describe('AL-001: Renders header', () => {
  it('shows Atemi Lab title and subtitle', () => {
    render(<AdversarialLab />)
    expect(screen.getByText('Atemi Lab')).toBeInTheDocument()
    expect(screen.getByText(/MCP protocol and tool integration/)).toBeInTheDocument()
  })
})

// ===========================================================================
// AL-002: Mode selector renders
// ===========================================================================
describe('AL-002: Mode selector renders', () => {
  it('shows all 4 attack mode radio buttons', () => {
    render(<AdversarialLab />)
    const radioGroup = screen.getByRole('radiogroup', { name: 'Select attack mode' })
    expect(radioGroup).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Passive/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Basic/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Advanced/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Aggressive/ })).toBeInTheDocument()
  })
})

// ===========================================================================
// AL-003: Default mode is passive
// ===========================================================================
describe('AL-003: Default mode is passive', () => {
  it('defaults to passive mode', () => {
    render(<AdversarialLab />)
    const passiveRadio = screen.getByRole('radio', { name: /Passive/ })
    expect(passiveRadio).toHaveAttribute('aria-checked', 'true')
  })
})

// ===========================================================================
// AL-004: Mode selection updates
// ===========================================================================
describe('AL-004: Mode selection updates', () => {
  it('activates advanced mode when clicked', () => {
    render(<AdversarialLab />)
    const advancedRadio = screen.getByRole('radio', { name: /Advanced/ })
    fireEvent.click(advancedRadio)
    expect(advancedRadio).toHaveAttribute('aria-checked', 'true')
  })
})

// ===========================================================================
// AL-005: Stats row renders
// ===========================================================================
describe('AL-005: Stats row renders', () => {
  it('shows Active Tools, MCP Attacks, Tool Attacks, Scenarios stats', () => {
    render(<AdversarialLab />)
    expect(screen.getByText('Active Tools')).toBeInTheDocument()
    expect(screen.getByText('MCP Attacks')).toBeInTheDocument()
    expect(screen.getByText('Tool Attacks')).toBeInTheDocument()
    expect(screen.getByText('Scenarios')).toBeInTheDocument()
  })
})

// ===========================================================================
// AL-006: Active tools count changes with mode
// ===========================================================================
describe('AL-006: Active tools count changes with mode', () => {
  it('shows more active tools in aggressive mode than passive', () => {
    const { unmount } = render(<AdversarialLab initialMode="passive" />)
    // In passive mode, only 1 tool enabled (notification-flood with minMode passive)
    // The "of 17 total" text is always present, and the count changes with mode
    const passiveText = screen.getByText('of 17 total')
    const passiveCountEl = passiveText.previousElementSibling
    const passiveCount = Number(passiveCountEl?.textContent ?? '0')
    unmount()

    render(<AdversarialLab initialMode="aggressive" />)
    const aggressiveText = screen.getByText('of 17 total')
    const aggressiveCountEl = aggressiveText.previousElementSibling
    const aggressiveCount = Number(aggressiveCountEl?.textContent ?? '0')
    expect(aggressiveCount).toBeGreaterThan(passiveCount)
  })
})

// ===========================================================================
// AL-007: Tabbed interface renders with attack tools in default tab
// ===========================================================================
describe('AL-007: Tabbed interface renders', () => {
  it('renders tab triggers and default attack-tools tab content', () => {
    render(<AdversarialLab />)
    // Tab triggers are present
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Attack Tools/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Skills/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Playbooks/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^MCP$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Agentic/i })).toBeInTheDocument()
    // Tool-type card visible in default tab (Browser Exploitation has minMode 'basic' but is type 'tool')
    expect(screen.getByTestId('tab-content-attack-tools')).toBeInTheDocument()
  })

  it('switches to the MCP tab when clicked', () => {
    render(<AdversarialLab />)
    fireEvent.click(screen.getByRole('tab', { name: /^MCP$/i }))
    expect(screen.getByTestId('tab-content-mcp')).toBeInTheDocument()
  })

  it('switches to the hidden workspaces from tab triggers', () => {
    render(<AdversarialLab />)

    fireEvent.click(screen.getByRole('tab', { name: /Playbooks/i }))
    expect(screen.getByTestId('playbook-runner')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Protocol Fuzz|Fuzz/i }))
    expect(screen.getByTestId('protocol-fuzz-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Agentic/i }))
    expect(screen.getByTestId('agentic-lab')).toBeInTheDocument()
  })

  it('surfaces quick-launch cards for advanced Atemi workspaces', () => {
    render(<AdversarialLab />)

    expect(screen.getByText('Run Guided Playbooks')).toBeInTheDocument()
    expect(screen.getByText('Open Protocol Fuzz')).toBeInTheDocument()
    expect(screen.getByText('Explore Agentic Lab')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Open Explore Agentic Lab/i }))
    expect(screen.getByTestId('agentic-lab')).toBeInTheDocument()
  })
})

// ===========================================================================
// AL-008: Config button opens config panel
// ===========================================================================
describe('AL-008: Config button opens config panel', () => {
  it('opens config panel when Config button clicked', () => {
    render(<AdversarialLab />)
    expect(screen.queryByTestId('atemi-config')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Open Atemi Lab configuration'))
    expect(screen.getByTestId('atemi-config')).toBeInTheDocument()
  })
})

// ===========================================================================
// AL-009: Getting started guide renders
// ===========================================================================
describe('AL-009: Getting started guide renders', () => {
  it('renders the getting started section', () => {
    render(<AdversarialLab />)
    expect(screen.getByTestId('getting-started')).toBeInTheDocument()
  })
})

// ===========================================================================
// AL-010: MCP connector status renders
// ===========================================================================
describe('AL-010: MCP connector status renders', () => {
  it('renders MCP connector status component', () => {
    render(<AdversarialLab connected={true} />)
    const mcp = screen.getByTestId('mcp-status')
    expect(mcp).toBeInTheDocument()
    expect(mcp).toHaveAttribute('data-connected', 'true')
  })
})

// ===========================================================================
// AL-011: Attack log renders
// ===========================================================================
describe('AL-011: Attack log renders', () => {
  it('renders the attack log component', () => {
    render(<AdversarialLab />)
    expect(screen.getByTestId('attack-log')).toBeInTheDocument()
  })
})

// ===========================================================================
// AL-012: Session history renders
// ===========================================================================
describe('AL-012: Session history renders', () => {
  it('renders the session history component', () => {
    render(<AdversarialLab />)
    expect(screen.getByTestId('session-history')).toBeInTheDocument()
  })
})
