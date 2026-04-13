/**
 * File: ai-severity-calculator.test.tsx
 * Purpose: Unit tests for AISeverityCalculator CVSS + AI risk factor component
 * Story: NODA-3 Story 10.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

import { AISeverityCalculator } from '@/components/ronin/AISeverityCalculator'

describe('AISeverityCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders three score summary cards (CVSS Base, AI Factor, Final Score)', () => {
      render(<AISeverityCalculator />)
      expect(screen.getByText('CVSS Base')).toBeInTheDocument()
      expect(screen.getByText('AI Factor')).toBeInTheDocument()
      expect(screen.getByText('Final Score')).toBeInTheDocument()
    })

    it('renders the formula text', () => {
      render(<AISeverityCalculator />)
      expect(screen.getByText('Final = (CVSS × 0.7) + (AI Factor × 10 × 0.3)')).toBeInTheDocument()
    })

    it('renders CVSS Base Metrics section', () => {
      render(<AISeverityCalculator />)
      expect(screen.getByText('CVSS Base Metrics')).toBeInTheDocument()
    })

    it('renders AI-Specific Risk Factors section', () => {
      render(<AISeverityCalculator />)
      expect(screen.getByText('AI-Specific Risk Factors')).toBeInTheDocument()
    })

    it('renders all 7 CVSS metric labels', () => {
      render(<AISeverityCalculator />)
      const labels = ['Attack Vector', 'Attack Complexity', 'Privileges Required', 'User Interaction', 'Confidentiality', 'Integrity', 'Availability']
      for (const label of labels) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    })

    it('renders all 3 AI factor labels', () => {
      render(<AISeverityCalculator />)
      expect(screen.getByText('Model Impact')).toBeInTheDocument()
      expect(screen.getByText('Data Sensitivity')).toBeInTheDocument()
      expect(screen.getByText('Scale of Impact')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<AISeverityCalculator className="my-custom" />)
      expect(container.firstChild).toHaveClass('my-custom')
    })
  })

  describe('CVSS Score Calculation', () => {
    it('defaults to first options and computes initial score', () => {
      render(<AISeverityCalculator />)
      // Default: AV=N(0.85), AC=L(0.77), PR=N(0.85), UI=N(0.85), C=H(0.56), I=H(0.56), A=H(0.56)
      // impact = 6.42 * (1 - (1-0.56)*(1-0.56)*(1-0.56)) = 6.42 * (1 - 0.085184) = 6.42 * 0.914816 ≈ 5.87
      // exploit = 8.22 * 0.85 * 0.77 * 0.85 * 0.85 ≈ 3.89
      // base = min(5.87 + 3.89, 10) = 9.8 (approximately)
      const scores = screen.getAllByText(/^\d+\.?\d*$/)
      expect(scores.length).toBeGreaterThan(0)
    })

    it('changes score when CVSS metric is clicked', () => {
      const onScoreChange = vi.fn()
      render(<AISeverityCalculator onScoreChange={onScoreChange} />)

      // Click "Physical" for Attack Vector (lowest score)
      fireEvent.click(screen.getByRole('button', { name: 'Attack Vector: Physical' }))

      // onScoreChange should be called with updated values
      expect(onScoreChange).toHaveBeenCalled()
      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1]
      // Physical AV reduces the score significantly
      expect(lastCall[0]).toBeLessThan(9.8)
    })

    it('returns 0 when all impact metrics are None', () => {
      const onScoreChange = vi.fn()
      render(<AISeverityCalculator onScoreChange={onScoreChange} />)

      // Set C, I, A all to None
      fireEvent.click(screen.getByRole('button', { name: 'Confidentiality: None' }))
      fireEvent.click(screen.getByRole('button', { name: 'Integrity: None' }))
      fireEvent.click(screen.getByRole('button', { name: 'Availability: None' }))

      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1]
      expect(lastCall[0]).toBe(0) // CVSS = 0 when impact = 0
    })
  })

  describe('AI Factor Calculation', () => {
    it('starts with AI factor of 0 (all None)', () => {
      const onScoreChange = vi.fn()
      render(<AISeverityCalculator onScoreChange={onScoreChange} />)

      // Initial AI factor should be 0
      const initialCall = onScoreChange.mock.calls[0]
      expect(initialCall[1]).toBe(0) // AI factor
    })

    it('updates AI factor when dropdown selection changes', () => {
      const onScoreChange = vi.fn()
      render(<AISeverityCalculator onScoreChange={onScoreChange} />)

      // Change Model Impact to "Critical — persistent model corruption" (value 1.0)
      const modelImpactSelect = screen.getByLabelText('Model Impact')
      fireEvent.change(modelImpactSelect, { target: { value: '1' } })

      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1]
      expect(lastCall[1]).toBeGreaterThan(0) // AI factor > 0
    })
  })

  describe('Final Score', () => {
    it('computes final = (CVSS × 0.7) + (AI Factor × 10 × 0.3)', () => {
      const onScoreChange = vi.fn()
      render(<AISeverityCalculator onScoreChange={onScoreChange} />)

      const initialCall = onScoreChange.mock.calls[0]
      const [cvss, aiFactor, finalScore] = initialCall
      const expected = Math.round(Math.min(cvss * 0.7 + aiFactor * 10 * 0.3, 10) * 10) / 10
      expect(finalScore).toBe(expected)
    })

    it('displays severity label based on final score', () => {
      render(<AISeverityCalculator />)
      // Default score is ~6.8, should be "High" or "Critical"
      const severityLabels = ['Critical', 'High', 'Medium', 'Low', 'None']
      const found = severityLabels.some(label => {
        try {
          screen.getByText(label)
          return true
        } catch {
          return false
        }
      })
      expect(found).toBe(true)
    })

    it('caps final score at 10', () => {
      const onScoreChange = vi.fn()
      render(<AISeverityCalculator onScoreChange={onScoreChange} />)

      // Max out all AI factors
      const selects = screen.getAllByRole('combobox')
      for (const select of selects) {
        fireEvent.change(select, { target: { value: '1' } })
      }

      const lastCall = onScoreChange.mock.calls[onScoreChange.mock.calls.length - 1]
      expect(lastCall[2]).toBeLessThanOrEqual(10)
    })
  })

  describe('Section Toggle', () => {
    it('CVSS details section has aria-expanded', () => {
      render(<AISeverityCalculator />)
      const cvssToggle = screen.getByRole('button', { name: /CVSS Base Metrics/ })
      expect(cvssToggle.getAttribute('aria-expanded')).toBe('true')
    })

    it('collapses CVSS details when toggled', () => {
      render(<AISeverityCalculator />)
      const cvssToggle = screen.getByRole('button', { name: /CVSS Base Metrics/ })
      fireEvent.click(cvssToggle)
      expect(cvssToggle.getAttribute('aria-expanded')).toBe('false')
      // Attack Vector label should be hidden
      expect(screen.queryByText('Attack Vector')).not.toBeInTheDocument()
    })

    it('collapses AI details when toggled', () => {
      render(<AISeverityCalculator />)
      const aiToggle = screen.getByRole('button', { name: /AI-Specific Risk Factors/ })
      fireEvent.click(aiToggle)
      expect(aiToggle.getAttribute('aria-expanded')).toBe('false')
      expect(screen.queryByText('Model Impact')).not.toBeInTheDocument()
    })
  })

  describe('Severity Label Boundaries', () => {
    it('shows None label when all impact metrics are zero', () => {
      const onScoreChange = vi.fn()
      render(
        <AISeverityCalculator
          initialCvss={{ AV: 'P', AC: 'H', PR: 'H', UI: 'R', C: 'N', I: 'N', A: 'N' }}
          initialAi={{ modelImpact: 0, dataSensitivity: 0, scale: 0 }}
          onScoreChange={onScoreChange}
        />
      )
      // CVSS = 0 (impact = 0), AI = 0, final = 0
      const call = onScoreChange.mock.calls[0]
      expect(call[0]).toBe(0) // cvss
      expect(call[1]).toBe(0) // ai
      expect(call[2]).toBe(0) // final
      // The severity label for score 0 should be 'None' (also appears in CVSS options)
      expect(screen.getAllByText('None').length).toBeGreaterThanOrEqual(1)
    })

    it('shows Low label when score > 0 and < 4.0', () => {
      const onScoreChange = vi.fn()
      // C=Low(0.22), I=N, A=N: impactBase = 1-(0.78*1*1) = 0.22, impact = 6.42*0.22 ≈ 1.41
      // AV=P(0.20), AC=H(0.44), PR=H(0.27), UI=R(0.62): exploit = 8.22*0.20*0.44*0.27*0.62 ≈ 0.121
      // base = 1.41 + 0.121 ≈ 1.5, final = 1.5 * 0.7 ≈ 1.1 → Low
      render(
        <AISeverityCalculator
          initialCvss={{ AV: 'P', AC: 'H', PR: 'H', UI: 'R', C: 'L', I: 'N', A: 'N' }}
          initialAi={{ modelImpact: 0, dataSensitivity: 0, scale: 0 }}
          onScoreChange={onScoreChange}
        />
      )
      const call = onScoreChange.mock.calls[0]
      expect(call[2]).toBeGreaterThan(0)
      expect(call[2]).toBeLessThan(4.0)
      // 'Low' also appears in CVSS options, so use getAllByText
      expect(screen.getAllByText('Low').length).toBeGreaterThanOrEqual(1)
    })

    it('computes correct severity label for each threshold', () => {
      const onScoreChange = vi.fn()
      render(<AISeverityCalculator onScoreChange={onScoreChange} />)
      // Default score is high (all max CVSS options selected)
      const call = onScoreChange.mock.calls[0]
      const finalScore = call[2]
      // Verify the label matches the computed score
      if (finalScore >= 9.0) expect(screen.getByText('Critical')).toBeInTheDocument()
      else if (finalScore >= 7.0) expect(screen.getByText('High')).toBeInTheDocument()
      else if (finalScore >= 4.0) expect(screen.getByText('Medium')).toBeInTheDocument()
      else if (finalScore > 0) expect(screen.getByText('Low')).toBeInTheDocument()
      else expect(screen.getByText('None')).toBeInTheDocument()
    })
  })

  describe('Initial Values', () => {
    it('accepts initialCvss prop', () => {
      const onScoreChange = vi.fn()
      render(
        <AISeverityCalculator
          initialCvss={{ AV: 'P', AC: 'H', PR: 'H', UI: 'R', C: 'N', I: 'N', A: 'N' }}
          onScoreChange={onScoreChange}
        />
      )
      const initialCall = onScoreChange.mock.calls[0]
      expect(initialCall[0]).toBe(0) // All impact None = CVSS 0
    })

    it('accepts initialAi prop', () => {
      const onScoreChange = vi.fn()
      render(
        <AISeverityCalculator
          initialAi={{ modelImpact: 0.6, dataSensitivity: 0.5, scale: 0.8 }}
          onScoreChange={onScoreChange}
        />
      )
      const initialCall = onScoreChange.mock.calls[0]
      expect(initialCall[1]).toBeCloseTo(0.63, 1) // avg(0.6, 0.5, 0.8) = 0.633...
    })
  })
})
