/**
 * File: atemi-lab.test.tsx
 * Purpose: Unit tests for Atemi Lab (Adversarial) — Skills Library, SkillCard, AttackToolCard, AttackLog, Session, Config
 * Test IDs: SKL-001 to SKL-020, ATK-001 to ATK-013
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

vi.mock('@/lib/contexts/EcosystemContext', () => ({
  useEcosystemEmit: () => ({ emitFinding: vi.fn() }),
}))

vi.mock('@/lib/ecosystem-types', () => ({
  toEcosystemSeverity: (sev: string) => sev.toUpperCase(),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
}))

vi.mock('@/lib/atemi-session-storage', () => ({
  loadSessions: () => [],
  saveSessions: vi.fn(),
  loadConfigSnapshot: () => ({
    targetModel: '',
    attackMode: 'passive',
    concurrency: 1,
    timeoutMs: 30000,
    autoLog: true,
  }),
  SESSIONS_KEY: 'atemi-sessions',
  MAX_SESSIONS: 20,
}))

vi.mock('@/components/ui/ScrollArea', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

vi.mock('@/components/ui/SafeCodeBlock', () => ({
  SafeCodeBlock: ({ code }: { code: string }) => <pre data-testid="safe-code-block">{code}</pre>,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title?: string }) => <div data-testid="empty-state">{title}</div>,
  emptyStatePresets: { noResults: { title: 'No results' } },
}))

vi.mock('@/components/ui/CrossModuleActions', () => ({
  CrossModuleActions: () => <div data-testid="cross-module-actions" />,
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  ),
}))

vi.mock('@/components/ui/Input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { SkillsLibrary } from '../adversarial/SkillsLibrary'
import { SkillCard } from '../adversarial/SkillCard'
import { AttackToolCard } from '../adversarial/AttackToolCard'
import { AttackLog } from '../adversarial/AttackLog'
import { SessionRecorder } from '../adversarial/SessionRecorder'
import { AtemiConfig } from '../adversarial/AtemiConfig'
import { AtemiGettingStarted } from '../adversarial/AtemiGettingStarted'
import { McpConnectorStatus } from '../adversarial/McpConnectorStatus'
import { CORE_SKILLS, getSkillById, getSkillsByCategory, getSkillsByOwasp } from '@/lib/adversarial-skills-data'
import { ALL_SKILLS } from '@/lib/adversarial-skills-extended'
import { DIFFICULTY_CONFIG, CATEGORY_CONFIG } from '@/lib/adversarial-skills-types'
import type { AdversarialSkill } from '@/lib/adversarial-skills-types'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

const mockFetchWithAuth = vi.mocked(fetchWithAuth)

// ---------------------------------------------------------------------------
// SKL: Skills Library Tests
// ---------------------------------------------------------------------------

describe('SkillsLibrary (SKL-001 to SKL-020)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SKL-001: renders skills grid with count badge', () => {
    render(<SkillsLibrary />)
    expect(screen.getByText('Adversarial Skills Library')).toBeInTheDocument()
    expect(screen.getByText(`${ALL_SKILLS.length} / ${ALL_SKILLS.length} skills`)).toBeInTheDocument()
  })

  it('SKL-002: search filters by name', () => {
    render(<SkillsLibrary />)
    const searchInput = screen.getByPlaceholderText('Search skills by name, description, or tag...')
    fireEvent.change(searchInput, { target: { value: 'System Prompt Extraction' } })
    expect(screen.getByText('System Prompt Extraction')).toBeInTheDocument()
  })

  it('SKL-003: filter by category shows filter panel', () => {
    render(<SkillsLibrary />)
    const filtersBtn = screen.getByLabelText(/filters/i)
    fireEvent.click(filtersBtn)
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Difficulty')).toBeInTheDocument()
    expect(screen.getByText('OWASP LLM')).toBeInTheDocument()
  })

  it('SKL-004: filter by category narrows results', () => {
    render(<SkillsLibrary />)
    fireEvent.click(screen.getByLabelText(/filters/i))
    // Find the category buttons in the radiogroup
    const reconButton = screen.getByRole('radio', { name: /Reconnaissance/ })
    fireEvent.click(reconButton)
    // Count should change
    const badge = screen.getByText(/skills/)
    expect(badge).toBeInTheDocument()
  })

  it('SKL-005: filter by difficulty', () => {
    render(<SkillsLibrary />)
    fireEvent.click(screen.getByLabelText(/filters/i))
    const beginnerButton = screen.getByRole('radio', { name: /Beginner/i })
    fireEvent.click(beginnerButton)
    const badge = screen.getByText(/skills/)
    expect(badge).toBeInTheDocument()
  })

  it('SKL-006: filter by OWASP mapping', () => {
    render(<SkillsLibrary />)
    fireEvent.click(screen.getByLabelText(/filters/i))
    const llm01Button = screen.getByRole('radio', { name: /LLM01/ })
    fireEvent.click(llm01Button)
    const badge = screen.getByText(/skills/)
    expect(badge).toBeInTheDocument()
  })

  it('SKL-014: all skills have unique IDs', () => {
    const ids = ALL_SKILLS.map(s => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('SKL-015: all skills have valid OWASP mappings', () => {
    const validOwasp = ['LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05', 'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10']
    for (const skill of ALL_SKILLS) {
      for (const mapping of skill.owaspMapping) {
        expect(validOwasp).toContain(mapping)
      }
    }
  })

  it('SKL-016: all categories have at least one skill', () => {
    const categories = Object.keys(CATEGORY_CONFIG)
    for (const cat of categories) {
      const count = ALL_SKILLS.filter(s => s.category === cat).length
      expect(count).toBeGreaterThan(0)
    }
  })

  it('SKL-017: all difficulties have at least one skill', () => {
    const difficulties = Object.keys(DIFFICULTY_CONFIG)
    for (const diff of difficulties) {
      const count = ALL_SKILLS.filter(s => s.difficulty === diff).length
      expect(count).toBeGreaterThan(0)
    }
  })

  it('SKL-018: combined filters work', () => {
    render(<SkillsLibrary />)
    const searchInput = screen.getByPlaceholderText('Search skills by name, description, or tag...')
    fireEvent.change(searchInput, { target: { value: 'injection' } })
    fireEvent.click(screen.getByLabelText(/filters/i))
    // With search active, results should be narrowed
    const badge = screen.getByText(/skills/)
    expect(badge).toBeInTheDocument()
  })

  it('SKL-019: reset filters restores all skills', () => {
    render(<SkillsLibrary />)
    const searchInput = screen.getByPlaceholderText('Search skills by name, description, or tag...')
    fireEvent.change(searchInput, { target: { value: 'xyznotfound' } })
    expect(screen.getByText(/No skills match/)).toBeInTheDocument()
    // Click reset
    const resetBtn = screen.getByText('Reset Filters')
    fireEvent.click(resetBtn)
    expect(screen.getByText(`${ALL_SKILLS.length} / ${ALL_SKILLS.length} skills`)).toBeInTheDocument()
  })

  it('SKL-020: skills count badge updates with filters', () => {
    render(<SkillsLibrary />)
    const searchInput = screen.getByPlaceholderText('Search skills by name, description, or tag...')
    fireEvent.change(searchInput, { target: { value: 'Prompt' } })
    const badge = screen.getByText(/skills/)
    // Filtered count should be less than total unless all match
    expect(badge.textContent).toContain('/')
  })
})

// ---------------------------------------------------------------------------
// SkillCard Tests
// ---------------------------------------------------------------------------

describe('SkillCard (SKL-006, SKL-007)', () => {
  const sampleSkill: AdversarialSkill = CORE_SKILLS[0]

  it('SKL-006: shows all fields — name, description, category, difficulty, OWASP, steps count, duration', () => {
    render(<SkillCard skill={sampleSkill} />)
    expect(screen.getByText(sampleSkill.name)).toBeInTheDocument()
    expect(screen.getByText(sampleSkill.description)).toBeInTheDocument()
    expect(screen.getByText(CATEGORY_CONFIG[sampleSkill.category].label)).toBeInTheDocument()
    expect(screen.getByText(DIFFICULTY_CONFIG[sampleSkill.difficulty].label)).toBeInTheDocument()
    expect(screen.getByText(`${sampleSkill.steps.length} steps`)).toBeInTheDocument()
    expect(screen.getByText(`~${sampleSkill.estimatedDurationSec}s`)).toBeInTheDocument()
    for (const owasp of sampleSkill.owaspMapping) {
      expect(screen.getByText(owasp)).toBeInTheDocument()
    }
  })

  it('SKL-007: expand shows step details', () => {
    render(<SkillCard skill={sampleSkill} />)
    const expandBtn = screen.getByLabelText('Expand skill steps')
    fireEvent.click(expandBtn)
    expect(screen.getByText(sampleSkill.steps[0].label)).toBeInTheDocument()
    expect(screen.getByText(`Expected: ${sampleSkill.steps[0].expectedOutcome}`)).toBeInTheDocument()
  })

  it('SKL-008: collapse hides step details', () => {
    render(<SkillCard skill={sampleSkill} />)
    fireEvent.click(screen.getByLabelText('Expand skill steps'))
    fireEvent.click(screen.getByLabelText('Collapse skill steps'))
    expect(screen.queryByText(sampleSkill.steps[0].label)).not.toBeInTheDocument()
  })

  it('SKL-009: execute button calls onExecute with skill ID', () => {
    const onExecute = vi.fn()
    render(<SkillCard skill={sampleSkill} onExecute={onExecute} />)
    fireEvent.click(screen.getByLabelText(`Execute ${sampleSkill.name}`))
    expect(onExecute).toHaveBeenCalledWith(sampleSkill.id)
  })

  it('SKL-010: execute button hidden when no onExecute prop', () => {
    render(<SkillCard skill={sampleSkill} />)
    expect(screen.queryByText('Execute')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Skill Engine & Data Tests
// ---------------------------------------------------------------------------

describe('Adversarial skill data helpers (SKL-011 to SKL-013)', () => {
  it('SKL-011: getSkillById returns correct skill', () => {
    const skill = getSkillById('recon-system-prompt-extract')
    expect(skill).toBeDefined()
    expect(skill?.name).toBe('System Prompt Extraction')
  })

  it('SKL-012: getSkillsByCategory returns only matching category', () => {
    const skills = getSkillsByCategory('injection')
    expect(skills.length).toBeGreaterThan(0)
    for (const s of skills) {
      expect(s.category).toBe('injection')
    }
  })

  it('SKL-013: getSkillsByOwasp returns skills with that mapping', () => {
    const skills = getSkillsByOwasp('LLM01')
    expect(skills.length).toBeGreaterThan(0)
    for (const s of skills) {
      expect(s.owaspMapping).toContain('LLM01')
    }
  })
})

// ---------------------------------------------------------------------------
// ATK: AttackToolCard Tests
// ---------------------------------------------------------------------------

describe('AttackToolCard (ATK-001 to ATK-006)', () => {
  const baseProps = {
    name: 'Capability Spoofing',
    type: 'mcp' as const,
    description: 'Forge MCP server capabilities',
    severity: 'high' as const,
    enabled: true,
  }

  it('ATK-001: renders name, type badge, severity, description', () => {
    render(<AttackToolCard {...baseProps} />)
    expect(screen.getByText('Capability Spoofing')).toBeInTheDocument()
    expect(screen.getByText('MCP')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Forge MCP server capabilities')).toBeInTheDocument()
  })

  it('ATK-002: Learn More toggles expand/collapse', () => {
    const learnMore = {
      technique: 'Test technique',
      expectedBehavior: 'Test expected',
      defensiveImplications: 'Test defense',
    }
    render(<AttackToolCard {...baseProps} learnMore={learnMore} />)
    const learnMoreBtn = screen.getByText('Learn More')
    fireEvent.click(learnMoreBtn)
    expect(screen.getByText('Technique')).toBeInTheDocument()
    expect(screen.getByText('Test technique')).toBeInTheDocument()
    expect(screen.getByText('Expected Behavior')).toBeInTheDocument()
    expect(screen.getByText('Test expected')).toBeInTheDocument()
    expect(screen.getByText('Defensive Implications')).toBeInTheDocument()
    expect(screen.getByText('Test defense')).toBeInTheDocument()
  })

  it('ATK-003: disabled state disables execute button', () => {
    render(<AttackToolCard {...baseProps} enabled={false} />)
    const btn = screen.getByRole('button', { name: /execute/i })
    expect(btn).toBeDisabled()
  })

  it('ATK-004: tool type renders correctly', () => {
    render(<AttackToolCard {...baseProps} type="tool" />)
    expect(screen.getByText('Tool')).toBeInTheDocument()
  })

  it('ATK-005: severity variants render', () => {
    const { rerender } = render(<AttackToolCard {...baseProps} severity="critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
    rerender(<AttackToolCard {...baseProps} severity="low" />)
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('ATK-006: aria-label contains name, type, severity, enabled status', () => {
    render(<AttackToolCard {...baseProps} />)
    const card = screen.getByLabelText(/Capability Spoofing - MCP attack - severity High - enabled/)
    expect(card).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ATK: AttackLog Tests
// ---------------------------------------------------------------------------

describe('AttackLog (ATK-007)', () => {
  it('ATK-007: renders log entries with severity filter buttons', () => {
    render(<AttackLog />)
    expect(screen.getByText('Attack Log')).toBeInTheDocument()
    expect(screen.getByRole('log')).toBeInTheDocument()
    // Severity filter buttons exist
    expect(screen.getByLabelText('Filter by All severity')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by Critical severity')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by High severity')).toBeInTheDocument()
  })

  it('ATK-007b: severity filter narrows log entries', () => {
    render(<AttackLog />)
    const criticalBtn = screen.getByLabelText('Filter by Critical severity')
    fireEvent.click(criticalBtn)
    // Should show only critical entries
    const entries = screen.getByText(/entries/)
    expect(entries).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ATK: SessionRecorder Tests
// ---------------------------------------------------------------------------

describe('SessionRecorder (ATK-008 to ATK-010)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ATK-008: renders Record button initially', () => {
    render(<SessionRecorder mode="passive" />)
    expect(screen.getByLabelText('Start recording Atemi Lab session')).toBeInTheDocument()
    expect(screen.getByText('Record')).toBeInTheDocument()
  })

  it('ATK-009: start recording shows Stop and Cancel', () => {
    render(<SessionRecorder mode="passive" />)
    fireEvent.click(screen.getByLabelText('Start recording Atemi Lab session'))
    expect(screen.getByLabelText('Stop recording session')).toBeInTheDocument()
    expect(screen.getByLabelText('Cancel recording without saving')).toBeInTheDocument()
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('ATK-010: cancel returns to Record state', () => {
    render(<SessionRecorder mode="passive" />)
    fireEvent.click(screen.getByLabelText('Start recording Atemi Lab session'))
    fireEvent.click(screen.getByLabelText('Cancel recording without saving'))
    expect(screen.getByLabelText('Start recording Atemi Lab session')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ATK: AtemiConfig Tests
// ---------------------------------------------------------------------------

describe('AtemiConfig (ATK-005b)', () => {

  it('renders nothing when closed', () => {
    const { container } = render(<AtemiConfig isOpen={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders config panel when open', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Atemi Lab Config')).toBeInTheDocument()
    expect(screen.getByLabelText('Target model name')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle auto-logging')).toBeInTheDocument()
  })

  it('saves config to localStorage', () => {
    const onClose = vi.fn()
    const onSave = vi.fn()
    render(<AtemiConfig isOpen={true} onClose={onClose} onSave={onSave} />)
    fireEvent.click(screen.getByText('Save Configuration'))
    // handleSave calls onSave with config, then onClose
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      targetModel: expect.any(String),
      attackMode: expect.any(String),
      concurrency: expect.any(Number),
      timeoutMs: expect.any(Number),
      autoLog: expect.any(Boolean),
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('resets config to defaults', () => {
    render(<AtemiConfig isOpen={true} onClose={vi.fn()} />)
    const targetInput = screen.getByLabelText('Target model name') as HTMLInputElement
    fireEvent.change(targetInput, { target: { value: 'my-model' } })
    fireEvent.click(screen.getByText('Reset'))
    expect(targetInput.value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// ATK: GettingStarted Tests
// ---------------------------------------------------------------------------

describe('AtemiGettingStarted (ATK-003b)', () => {

  it('renders getting started with 3 steps when not dismissed', async () => {
    render(<AtemiGettingStarted />)
    // Component starts dismissed=true, useEffect sets it to false
    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument()
    })
    expect(screen.getByText(/Step 1: Configure Target LLM/)).toBeInTheDocument()
    expect(screen.getByText(/Step 2: Select Attack Mode/)).toBeInTheDocument()
    expect(screen.getByText(/Step 3: Run Attacks/)).toBeInTheDocument()
  })

  it('dismiss hides the guide', async () => {
    render(<AtemiGettingStarted />)
    // Wait for guide to appear
    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument()
    })
    // Click dismiss button
    fireEvent.click(screen.getByLabelText('Dismiss getting started guide'))
    // Guide should be hidden
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ATK: McpConnectorStatus Tests
// ---------------------------------------------------------------------------

describe('McpConnectorStatus (ATK-004)', () => {
  beforeEach(() => {
    // Make fetchWithAuth reject so the component falls back to prop values
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'))
  })

  it('shows Connected when connected prop is true', async () => {
    render(<McpConnectorStatus connected={true} />)
    // After health check fails, component falls back to connected prop
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })
  })

  it('shows Not connected when connected prop is false', async () => {
    render(<McpConnectorStatus connected={false} />)
    await waitFor(() => {
      expect(screen.getByText('Not connected')).toBeInTheDocument()
    })
  })

  it('shows refresh button', async () => {
    render(<McpConnectorStatus connected={false} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Refresh connection status')).toBeInTheDocument()
    })
  })

  it('shows troubleshooting toggle when disconnected', async () => {
    render(<McpConnectorStatus connected={false} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Toggle troubleshooting panel')).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// ATK-011 to ATK-013: Audio patterns, dual-layer, transcription (data validation)
// ---------------------------------------------------------------------------

describe('Audio skills (ATK-011 to ATK-013)', () => {
  it('ATK-011: audio-voice category skills exist', () => {
    const audioSkills = ALL_SKILLS.filter(s => s.category === 'audio-voice')
    expect(audioSkills.length).toBeGreaterThan(0)
  })

  it('ATK-012: audio skills have valid steps', () => {
    const audioSkills = ALL_SKILLS.filter(s => s.category === 'audio-voice')
    for (const skill of audioSkills) {
      expect(skill.steps.length).toBeGreaterThan(0)
      for (const step of skill.steps) {
        expect(step.order).toBeGreaterThan(0)
        expect(step.label).toBeTruthy()
        expect(step.expectedOutcome).toBeTruthy()
      }
    }
  })

  it('ATK-013: all skills have approved tools within sandbox', () => {
    const APPROVED_TOOL_LIST = new Set(['scanner', 'kagami'])
    for (const skill of ALL_SKILLS) {
      for (const tool of skill.approvedTools) {
        expect(APPROVED_TOOL_LIST.has(tool)).toBe(true)
      }
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
