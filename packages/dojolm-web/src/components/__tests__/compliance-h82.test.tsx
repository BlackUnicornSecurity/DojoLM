/**
 * File: compliance-h82.test.tsx
 * Purpose: Tests for H8.2 Framework Checklists Expansion
 * Test IDs: H82-001 to H82-014
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icon = ({ children, ...props }: Record<string, unknown>) => <svg {...props}>{children as ReactNode}</svg>
  return {
    CheckSquare: icon,
    Square: icon,
    Download: icon,
    User: icon,
    Calendar: icon,
    FileText: icon,
    StickyNote: icon,
    Filter: icon,
    ChevronDown: icon,
    Layers: icon,
  }
})

// Mock BAISS framework data with multiple categories and mapped frameworks
vi.mock('@/lib/data/baiss-framework', () => ({
  BAISS_CONTROLS: [
    {
      id: 'BAISS-001',
      title: 'Prompt Injection Prevention',
      description: 'Prevent prompt injection attacks',
      category: 'input-security',
      assessmentType: 'semi-automated',
      mappedFrameworks: { owasp: ['LLM01'], nist: ['NIST-SEC'], mitre: ['AML.T0060'] },
    },
    {
      id: 'BAISS-002',
      title: 'Output Sanitization',
      description: 'Sanitize LLM outputs',
      category: 'output-security',
      assessmentType: 'manual',
      mappedFrameworks: { owasp: ['LLM02'], euAi: ['EU-ART15'] },
    },
    {
      id: 'BAISS-003',
      title: 'Model Access Control',
      description: 'Control access to models',
      category: 'model-protection',
      assessmentType: 'automated',
      mappedFrameworks: { mitre: ['AML.T0040'], saif: ['SAIF-P4-2'] },
    },
    {
      id: 'BAISS-004',
      title: 'AI Governance Policy',
      description: 'Establish governance policy',
      category: 'governance',
      assessmentType: 'manual',
      mappedFrameworks: { iso: ['ISO-5.1'], euAi: ['EU-ART14'], euAiGpai: ['GPAI-53A'] },
    },
    {
      id: 'BAISS-005',
      title: 'Data Provenance',
      description: 'Track data provenance',
      category: 'data-governance',
      assessmentType: 'semi-automated',
      mappedFrameworks: { nist218a: ['NIST-218A-PS.3'], gdpr: ['GDPR-AI-1'] },
    },
    {
      id: 'BAISS-006',
      title: 'Supply Chain Audit',
      description: 'Audit supply chain',
      category: 'supply-chain',
      assessmentType: 'manual',
      mappedFrameworks: { slsa: ['SLSA-L1'], cisaNcsc: ['CISA-SD-1'] },
    },
  ],
  BAISS_CATEGORIES: [
    { id: 'input-security', label: 'Input Security', description: '' },
    { id: 'output-security', label: 'Output Security', description: '' },
    { id: 'model-protection', label: 'Model Protection', description: '' },
    { id: 'data-governance', label: 'Data Governance & Privacy', description: '' },
    { id: 'supply-chain', label: 'Supply Chain', description: '' },
    { id: 'governance', label: 'Governance', description: '' },
  ],
}))

// localStorage mock
let localStorageData: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageData[key] }),
  clear: vi.fn(() => { localStorageData = {} }),
  get length() { return Object.keys(localStorageData).length },
  key: vi.fn((index: number) => Object.keys(localStorageData)[index] ?? null),
}

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

// Import after mocks
import { ComplianceChecklist, FRAMEWORK_REGISTRY, FRAMEWORK_TIERS, getStorageKey, getControlsForFramework, FRAMEWORK_KEY_MAP } from '../compliance/ComplianceChecklist'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('H8.2: Framework Checklists Expansion', () => {
  beforeEach(() => {
    localStorageData = {}
    vi.clearAllMocks()
  })

  // --- Framework Registry ---

  describe('Framework Registry', () => {
    it('H82-001: FRAMEWORK_REGISTRY contains all 27 frameworks plus BAISS', () => {
      // 27 external frameworks + 1 BAISS = 28 total
      expect(FRAMEWORK_REGISTRY).toHaveLength(28)
    })

    it('H82-002: All required major frameworks are present', () => {
      const ids = FRAMEWORK_REGISTRY.map((f) => f.id)
      const requiredFrameworks = [
        'baiss',
        'owasp-llm-top10',
        'nist-ai-600-1',
        'mitre-atlas',
        'iso-42001',
        'eu-ai-act',
        'eu-ai-act-gpai',
        'nist-800-218a',
        'iso-23894',
        'google-saif',
        'cisa-ncsc',
      ]
      for (const id of requiredFrameworks) {
        expect(ids).toContain(id)
      }
    })

    it('H82-003: Frameworks are grouped by tier', () => {
      const tiers = new Set(FRAMEWORK_REGISTRY.map((f) => f.tier))
      expect(tiers).toContain('core')
      expect(tiers).toContain('high')
      expect(tiers).toContain('medium')
      expect(tiers).toContain('regional')
    })

    it('H82-004: FRAMEWORK_TIERS has all 4 tier groups', () => {
      expect(FRAMEWORK_TIERS).toHaveLength(4)
      const tierValues = FRAMEWORK_TIERS.map((t) => t.tier)
      expect(tierValues).toEqual(['core', 'high', 'medium', 'regional'])
    })

    it('H82-005: Each framework has valid fields', () => {
      for (const fw of FRAMEWORK_REGISTRY) {
        expect(fw.id).toBeTruthy()
        expect(fw.name).toBeTruthy()
        expect(fw.version).toBeTruthy()
        expect(fw.controlCount).toBeGreaterThan(0)
        expect(['core', 'high', 'medium', 'regional']).toContain(fw.tier)
      }
    })
  })

  // --- Storage Key ---

  describe('Per-framework storage keys', () => {
    it('H82-006: BAISS uses legacy storage key', () => {
      expect(getStorageKey('baiss')).toBe('bushido-checklists')
    })

    it('H82-007: Other frameworks use prefixed storage key', () => {
      expect(getStorageKey('owasp-llm-top10')).toBe('bushido-checklists-owasp-llm-top10')
      expect(getStorageKey('eu-ai-act')).toBe('bushido-checklists-eu-ai-act')
      expect(getStorageKey('google-saif')).toBe('bushido-checklists-google-saif')
    })
  })

  // --- Framework Controls ---

  describe('getControlsForFramework', () => {
    it('H82-008: BAISS returns non-automated controls', () => {
      const controls = getControlsForFramework('baiss')
      // Should be 5 non-automated controls (excluding BAISS-003 which is automated)
      expect(controls).toHaveLength(5)
      for (const c of controls) {
        expect(['manual', 'semi-automated']).toContain(c.assessmentType)
      }
    })

    it('H82-009: OWASP returns mapped BAISS controls', () => {
      const controls = getControlsForFramework('owasp-llm-top10')
      // BAISS-001 and BAISS-002 have owasp mappings, both are non-automated
      expect(controls.length).toBeGreaterThanOrEqual(2)
      for (const c of controls) {
        expect(c.mappedFrameworks.owasp).toBeDefined()
        expect(c.mappedFrameworks.owasp!.length).toBeGreaterThan(0)
      }
    })

    it('H82-010: FRAMEWORK_KEY_MAP covers all non-BAISS frameworks', () => {
      const nonBaiss = FRAMEWORK_REGISTRY.filter((f) => f.id !== 'baiss')
      for (const fw of nonBaiss) {
        expect(FRAMEWORK_KEY_MAP[fw.id]).toBeDefined()
      }
    })
  })

  // --- Component Rendering ---

  describe('Framework selector UI', () => {
    it('H82-011: Renders framework selector trigger with BAISS default', () => {
      render(<ComplianceChecklist />)
      const trigger = screen.getByTestId('framework-selector-trigger')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveTextContent('BAISS Unified Standard')
    })

    it('H82-012: Opening selector shows all tier groups and frameworks', () => {
      render(<ComplianceChecklist />)
      fireEvent.click(screen.getByTestId('framework-selector-trigger'))

      const dropdown = screen.getByTestId('framework-selector-dropdown')
      expect(dropdown).toBeInTheDocument()

      // Check tier headers
      expect(dropdown).toHaveTextContent('Core Frameworks')
      expect(dropdown).toHaveTextContent('High Priority')
      expect(dropdown).toHaveTextContent('Medium Priority')
      expect(dropdown).toHaveTextContent('Regional & Referenced')

      // Check key frameworks appear
      expect(dropdown).toHaveTextContent('OWASP LLM Top 10')
      expect(dropdown).toHaveTextContent('NIST AI RMF 600-1')
      expect(dropdown).toHaveTextContent('MITRE ATLAS')
      expect(dropdown).toHaveTextContent('EU AI Act')
      expect(dropdown).toHaveTextContent('Google SAIF')
      expect(dropdown).toHaveTextContent('CISA/NCSC')
      expect(dropdown).toHaveTextContent('EU AI Act GPAI')
    })

    it('H82-013: Selecting a framework updates the display and closes dropdown', () => {
      render(<ComplianceChecklist />)

      // Open selector
      fireEvent.click(screen.getByTestId('framework-selector-trigger'))
      expect(screen.getByTestId('framework-selector-dropdown')).toBeInTheDocument()

      // Select OWASP
      fireEvent.click(screen.getByTestId('framework-option-owasp-llm-top10'))

      // Dropdown closes
      expect(screen.queryByTestId('framework-selector-dropdown')).not.toBeInTheDocument()

      // Trigger shows new framework
      expect(screen.getByTestId('framework-selector-trigger')).toHaveTextContent('OWASP LLM Top 10')
    })
  })

  // --- Per-framework persistence ---

  describe('Per-framework localStorage persistence', () => {
    it('H82-014: Checklist state persists independently per framework', () => {
      const { unmount } = render(<ComplianceChecklist />)

      // Sign off a control on BAISS
      const signOffButtons = screen.getAllByLabelText(/Mark .* as signed off/)
      fireEvent.click(signOffButtons[0])

      // Verify BAISS data saved
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bushido-checklists',
        expect.any(String)
      )
      const baissData = localStorageData['bushido-checklists']
      expect(baissData).toBeDefined()
      const parsed = JSON.parse(baissData)
      const firstKey = Object.keys(parsed)[0]
      expect(parsed[firstKey].signedOff).toBe(true)

      unmount()

      // Re-render and switch to OWASP
      const { unmount: unmount2 } = render(<ComplianceChecklist />)
      fireEvent.click(screen.getByTestId('framework-selector-trigger'))
      fireEvent.click(screen.getByTestId('framework-option-owasp-llm-top10'))

      // OWASP should have no signed-off state yet
      expect(localStorageMock.getItem).toHaveBeenCalledWith('bushido-checklists-owasp-llm-top10')

      // Sign off a control on OWASP
      const owaspSignOffs = screen.getAllByLabelText(/Mark .* as signed off/)
      if (owaspSignOffs.length > 0) {
        fireEvent.click(owaspSignOffs[0])
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'bushido-checklists-owasp-llm-top10',
          expect.any(String)
        )
      }

      // Verify BAISS data unchanged
      const baissDataAfter = localStorageData['bushido-checklists']
      expect(baissDataAfter).toBe(baissData)

      unmount2()
    })
  })

  // --- Filter functionality ---

  describe('Filters work across frameworks', () => {
    it('H82-015: Filter by manual shows only manual controls', () => {
      render(<ComplianceChecklist />)

      // Click Manual filter
      const manualBtn = screen.getByText('Manual')
      fireEvent.click(manualBtn)

      // All visible controls should be manual type
      const manualBadges = screen.getAllByText('manual')
      expect(manualBadges.length).toBeGreaterThan(0)

      // No semi-automated badges should be visible
      const semiAutoBadges = screen.queryAllByText('semi-automated')
      expect(semiAutoBadges).toHaveLength(0)
    })

    it('H82-016: Filter by semi-auto shows only semi-automated controls', () => {
      render(<ComplianceChecklist />)

      const semiAutoBtn = screen.getByText('Semi-Auto')
      fireEvent.click(semiAutoBtn)

      const semiAutoBadges = screen.getAllByText('semi-automated')
      expect(semiAutoBadges.length).toBeGreaterThan(0)

      const manualBadges = screen.queryAllByText('manual')
      expect(manualBadges).toHaveLength(0)
    })

    it('H82-017: Filters reset when switching frameworks', () => {
      render(<ComplianceChecklist />)

      // Set a filter
      fireEvent.click(screen.getByText('Manual'))

      // Switch framework
      fireEvent.click(screen.getByTestId('framework-selector-trigger'))
      fireEvent.click(screen.getByTestId('framework-option-owasp-llm-top10'))

      // All filter should be active (check by aria-pressed)
      const allButton = screen.getByText(/^All \(/)
      expect(allButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  // --- Export ---

  describe('Export includes framework name', () => {
    it('H82-018: Export button is present', () => {
      render(<ComplianceChecklist />)
      const exportBtn = screen.getByLabelText('Export checklist as text file')
      expect(exportBtn).toBeInTheDocument()
    })
  })
})
