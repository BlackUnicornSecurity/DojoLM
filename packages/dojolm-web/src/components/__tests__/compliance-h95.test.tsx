/**
 * File: compliance-h95.test.tsx
 * Purpose: Tests for H9.5 — Compliance Export
 * Verifies:
 * - Component renders with format selector and export button
 * - Markdown export contains executive summary & control matrix
 * - JSON export is valid JSON with expected structure
 * - CSV export has correct headers and rows
 * - Sanitization strips HTML from output
 * - No export / null render when no framework data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange: (v: string) => void
  }) => (
    <div data-testid="select-root" data-value={value}>
      {children}
      <select
        data-testid="format-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="markdown">Markdown</option>
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
  }: {
    children: React.ReactNode
    value: string
  }) => <div>{children}</div>,
  SelectTrigger: ({
    children,
  }: {
    children: React.ReactNode
    className?: string
  }) => <div>{children}</div>,
  SelectValue: () => <span>Format</span>,
}))

vi.mock('lucide-react', () => ({
  Download: () => <span data-testid="icon-download">DL</span>,
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  ComplianceExport,
  sanitizeForExport,
  generateMarkdown,
  generateJSON,
  generateCSV,
} from '../compliance/ComplianceExport'
import type { ComplianceFrameworkExport } from '../compliance/ComplianceExport'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockFramework: ComplianceFrameworkExport = {
  id: 'owasp-llm-10',
  name: 'OWASP LLM Top 10',
  overallCoverage: 72,
  controls: [
    {
      id: 'LLM01',
      name: 'Prompt Injection',
      status: 'covered',
      coverage: 85,
    },
    {
      id: 'LLM02',
      name: 'Insecure Output Handling',
      status: 'partial',
      coverage: 50,
    },
    {
      id: 'LLM03',
      name: 'Training Data Poisoning',
      status: 'gap',
      coverage: 0,
    },
    {
      id: 'LLM04',
      name: 'Model Denial of Service',
      status: 'gap',
      coverage: 10,
    },
  ],
}

// ---------------------------------------------------------------------------
// Tests: sanitizeForExport
// ---------------------------------------------------------------------------

describe('sanitizeForExport', () => {
  it('strips HTML tags', () => {
    const result = sanitizeForExport('<script>alert("xss")</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('preserves already-escaped entities', () => {
    const result = sanitizeForExport('&lt;safe&gt;')
    expect(result).toBe('&lt;safe&gt;')
  })

  it('truncates long strings to 5000 chars', () => {
    const long = 'a'.repeat(6000)
    expect(sanitizeForExport(long).length).toBe(5000)
  })

  it('handles empty string', () => {
    expect(sanitizeForExport('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Tests: generateMarkdown
// ---------------------------------------------------------------------------

describe('generateMarkdown', () => {
  it('contains executive summary with framework name', () => {
    const md = generateMarkdown(mockFramework)
    expect(md).toContain('# Compliance Report: OWASP LLM Top 10')
    expect(md).toContain('**Overall Coverage:** 72%')
  })

  it('contains control matrix table', () => {
    const md = generateMarkdown(mockFramework)
    expect(md).toContain('## Control Matrix')
    expect(md).toContain('| Control ID | Name | Status | Coverage |')
    expect(md).toContain('| LLM01 | Prompt Injection | covered | 85% |')
  })

  it('lists gaps separately', () => {
    const md = generateMarkdown(mockFramework)
    expect(md).toContain('## Gap List')
    expect(md).toContain(
      '**LLM03**: Training Data Poisoning (0% coverage)',
    )
    expect(md).toContain(
      '**LLM04**: Model Denial of Service (10% coverage)',
    )
  })

  it('sanitizes HTML in control names', () => {
    const data = {
      ...mockFramework,
      controls: [
        {
          id: 'X1',
          name: '<img onerror=alert(1)>',
          status: 'gap',
          coverage: 0,
        },
      ],
    }
    const md = generateMarkdown(data)
    expect(md).not.toContain('<img')
    expect(md).toContain('&lt;img')
  })
})

// ---------------------------------------------------------------------------
// Tests: generateJSON
// ---------------------------------------------------------------------------

describe('generateJSON', () => {
  it('produces valid JSON', () => {
    const json = generateJSON(mockFramework)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('has expected structure', () => {
    const parsed = JSON.parse(generateJSON(mockFramework))
    expect(parsed.report).toBeDefined()
    expect(parsed.report.framework).toBe('OWASP LLM Top 10')
    expect(parsed.report.frameworkId).toBe('owasp-llm-10')
    expect(parsed.report.overallCoverage).toBe(72)
    expect(parsed.report.controls).toHaveLength(4)
    expect(parsed.report.gaps).toHaveLength(2)
  })

  it('includes gap IDs', () => {
    const parsed = JSON.parse(generateJSON(mockFramework))
    const gapIds = parsed.report.gaps.map(
      (g: { id: string }) => g.id,
    )
    expect(gapIds).toContain('LLM03')
    expect(gapIds).toContain('LLM04')
  })

  it('sanitizes HTML in JSON output', () => {
    const data = {
      ...mockFramework,
      name: '<script>alert(1)</script>',
    }
    const json = generateJSON(data)
    expect(json).not.toContain('<script>')
    expect(json).toContain('&lt;script&gt;')
  })
})

// ---------------------------------------------------------------------------
// Tests: generateCSV
// ---------------------------------------------------------------------------

describe('generateCSV', () => {
  it('has correct header row', () => {
    const csv = generateCSV(mockFramework)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Control ID,Name,Status,Coverage')
  })

  it('has correct number of data rows', () => {
    const csv = generateCSV(mockFramework)
    const lines = csv.split('\n')
    // header + 4 controls
    expect(lines).toHaveLength(5)
  })

  it('escapes commas in field values', () => {
    const data = {
      ...mockFramework,
      controls: [
        {
          id: 'C1',
          name: 'Control, with comma',
          status: 'covered',
          coverage: 100,
        },
      ],
    }
    const csv = generateCSV(data)
    // Field with comma should be quoted
    expect(csv).toContain('"Control, with comma"')
  })
})

// ---------------------------------------------------------------------------
// Tests: ComplianceExport component
// ---------------------------------------------------------------------------

describe('ComplianceExport', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders format selector and export button', () => {
    render(<ComplianceExport frameworkData={mockFramework} />)
    expect(screen.getByTestId('compliance-export')).toBeInTheDocument()
    expect(screen.getByTestId('export-btn')).toBeInTheDocument()
    expect(screen.getByTestId('format-select')).toBeInTheDocument()
  })

  it('renders nothing when frameworkData is null', () => {
    const { container } = render(
      <ComplianceExport frameworkData={null} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('triggers download on export click', () => {
    const mockClick = vi.fn()
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test')
    const mockRevokeObjectURL = vi.fn()

    // Mock URL methods
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    // Save original and mock createElement to intercept anchor creation
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const el = origCreateElement('a')
        el.click = mockClick
        return el
      }
      return origCreateElement(tag)
    })

    render(<ComplianceExport frameworkData={mockFramework} />)
    fireEvent.click(screen.getByTestId('export-btn'))

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('switches format via select', () => {
    render(<ComplianceExport frameworkData={mockFramework} />)
    const select = screen.getByTestId('format-select')
    fireEvent.change(select, { target: { value: 'json' } })
    expect(select).toHaveValue('json')
  })

  it('export button has accessible label', () => {
    render(<ComplianceExport frameworkData={mockFramework} />)
    expect(
      screen.getByLabelText(/export compliance report/i),
    ).toBeInTheDocument()
  })
})
