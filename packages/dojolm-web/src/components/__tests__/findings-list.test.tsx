/**
 * File: findings-list.test.tsx
 * Purpose: Tests for FindingsList component (Story TPI-UIP-05)
 * Index:
 * - Empty state tests (line 14)
 * - BLOCK verdict tests (line 30)
 * - ALLOW verdict tests (line 83)
 * - SeverityBadge tests (line 105)
 * - Match truncation tests (line 128)
 * - Accessibility tests (line 142)
 * - PerformanceInfo tests (line 169)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FindingsList } from '@/components/scanner/FindingsList'
import { SeverityBadge } from '@/components/ui/SeverityBadge'

const mockBlockResult = {
  verdict: 'BLOCK' as const,
  findings: [
    {
      severity: 'CRITICAL' as const,
      category: 'prompt-injection',
      description: 'Direct prompt injection detected',
      match: 'ignore previous instructions',
      engine: 'core',
      pattern_name: 'direct-override',
      source: 'current' as const,
    },
    {
      severity: 'WARNING' as const,
      category: 'jailbreak',
      description: 'Jailbreak attempt',
      match: 'DAN mode enabled',
      engine: 'jailbreak',
      pattern_name: 'dan-variant',
      source: 'current' as const,
    },
  ],
  counts: { critical: 1, warning: 1, info: 0 },
  textLength: 100,
  normalizedLength: 95,
  elapsed: 2.5,
}

const mockAllowResult = {
  verdict: 'ALLOW' as const,
  findings: [],
  counts: { critical: 0, warning: 0, info: 0 },
  textLength: 50,
  normalizedLength: 48,
  elapsed: 1.2,
}

describe('FindingsList', () => {
  describe('Empty state (no result)', () => {
    it('renders placeholder when no result', () => {
      render(<FindingsList result={null} />)
      expect(screen.getByText('The dojo is quiet')).toBeInTheDocument()
    })
  })

  describe('BLOCK verdict', () => {
    it('renders threat detected header', () => {
      render(<FindingsList result={mockBlockResult} />)
      expect(screen.getByText('Threat Detected')).toBeInTheDocument()
    })

    it('shows finding count in verdict header', () => {
      render(<FindingsList result={mockBlockResult} />)
      expect(screen.getByText('2 findings')).toBeInTheDocument()
    })

    it('renders pulsing threat indicator', () => {
      const { container } = render(<FindingsList result={mockBlockResult} />)
      const pulsingDot = container.querySelector('.animate-ping')
      expect(pulsingDot).toBeInTheDocument()
    })

    it('renders ShieldAlert icon for BLOCK', () => {
      const { container } = render(<FindingsList result={mockBlockResult} />)
      // ShieldAlert is rendered as SVG with h-8 w-8 class
      const icon = container.querySelector('svg.h-8.w-8')
      expect(icon).toBeInTheDocument()
    })

    it('renders finding cards', () => {
      render(<FindingsList result={mockBlockResult} />)
      expect(screen.getByText('prompt-injection')).toBeInTheDocument()
      expect(screen.getByText('jailbreak')).toBeInTheDocument()
    })

    it('shows BLOCK in result summary', () => {
      render(<FindingsList result={mockBlockResult} />)
      expect(screen.getByText('BLOCK')).toBeInTheDocument()
    })

    it('uses CSS variable colors for severity counts', () => {
      const { container } = render(<FindingsList result={mockBlockResult} />)
      // Critical count uses --danger token
      const criticalCount = container.querySelector('.text-\\[var\\(--danger\\)\\]')
      expect(criticalCount).toBeInTheDocument()
    })
  })

  describe('ALLOW verdict', () => {
    it('renders safe header', () => {
      render(<FindingsList result={mockAllowResult} />)
      expect(screen.getByText('Safe')).toBeInTheDocument()
    })

    it('shows no findings message', () => {
      render(<FindingsList result={mockAllowResult} />)
      expect(screen.getByText('No findings detected. Text appears safe.')).toBeInTheDocument()
    })

    it('shows ALLOW in result summary', () => {
      render(<FindingsList result={mockAllowResult} />)
      expect(screen.getByText('ALLOW')).toBeInTheDocument()
    })
  })

  describe('Match truncation', () => {
    it('truncates long match text to 200 chars', () => {
      const longMatch = 'A'.repeat(250)
      const resultWithLongMatch = {
        ...mockBlockResult,
        findings: [{
          ...mockBlockResult.findings[0],
          match: longMatch,
        }],
      }
      render(<FindingsList result={resultWithLongMatch} />)
      // Truncated to 197 chars + "..."
      const matchElement = screen.getByText(/^A+\.\.\.$/i)
      expect(matchElement).toBeInTheDocument()
      expect(matchElement.textContent!.length).toBeLessThanOrEqual(200)
    })

    it('does not truncate short match text', () => {
      render(<FindingsList result={mockBlockResult} />)
      expect(screen.getByText('ignore previous instructions')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has aria-live polite region for verdict', () => {
      const { container } = render(<FindingsList result={mockBlockResult} />)
      const liveRegion = container.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('has role="status" on verdict region', () => {
      const { container } = render(<FindingsList result={mockBlockResult} />)
      const statusRegion = container.querySelector('[role="status"]')
      expect(statusRegion).toBeInTheDocument()
    })

    it('pulsing dot has motion-reduce companion', () => {
      const { container } = render(<FindingsList result={mockBlockResult} />)
      const pulsingDot = container.querySelector('.animate-ping')
      expect(pulsingDot).toHaveClass('motion-reduce:animate-none')
    })

    it('decorative icons have aria-hidden', () => {
      const { container } = render(<FindingsList result={mockBlockResult} />)
      const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenIcons.length).toBeGreaterThan(0)
    })
  })

  describe('PerformanceInfo', () => {
    it('shows scan metrics', () => {
      render(<FindingsList result={mockBlockResult} />)
      expect(screen.getByText('Scanned 100 chars')).toBeInTheDocument()
      expect(screen.getByText('Normalized to 95 chars')).toBeInTheDocument()
      expect(screen.getByText('2.5ms elapsed')).toBeInTheDocument()
    })

    it('shows timestamp', () => {
      render(<FindingsList result={mockBlockResult} />)
      // Timestamp format varies by locale, just check a time-like pattern exists
      const performanceSection = screen.getByText('2.5ms elapsed').parentElement
      expect(performanceSection?.textContent).toMatch(/\d{1,2}:\d{2}/)
    })
  })
})

describe('SeverityBadge', () => {
  it('renders CRITICAL badge with correct label', () => {
    render(<SeverityBadge severity="CRITICAL" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders WARNING badge with correct label', () => {
    render(<SeverityBadge severity="WARNING" />)
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('renders INFO badge with correct label', () => {
    render(<SeverityBadge severity="INFO" />)
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('renders icon by default', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" />)
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('hides icon when showIcon=false', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" showIcon={false} />)
    const icon = container.querySelector('svg')
    expect(icon).not.toBeInTheDocument()
  })

  it('uses CSS variable colors for CRITICAL', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" />)
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('var(--danger)')
  })

  it('uses CSS variable colors for WARNING', () => {
    const { container } = render(<SeverityBadge severity="WARNING" />)
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('var(--warning)')
  })

  it('uses CSS variable colors for INFO', () => {
    const { container } = render(<SeverityBadge severity="INFO" />)
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('var(--severity-low)')
  })
})
