/**
 * File: AISeverityCalculator.tsx
 * Purpose: CVSS + AI-specific risk factor calculator for vulnerability scoring
 * Story: NODA-3 Story 10.4
 * Index:
 * - CVSS_METRICS (line 18)
 * - AI_FACTORS (line 66)
 * - calculateCVSSBase() (line 87)
 * - calculateAIFactor() (line 116)
 * - AISeverityCalculatorProps (line 128)
 * - AISeverityCalculator component (line 138)
 */

'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Shield, Brain, Calculator, ChevronDown } from 'lucide-react'

// ---------------------------------------------------------------------------
// CVSS Base Metric Definitions
// ---------------------------------------------------------------------------

interface MetricOption {
  value: string
  label: string
  score: number
}

interface CvssMetric {
  key: string
  label: string
  options: MetricOption[]
}

const CVSS_METRICS: CvssMetric[] = [
  {
    key: 'AV', label: 'Attack Vector',
    options: [
      { value: 'N', label: 'Network', score: 0.85 },
      { value: 'A', label: 'Adjacent', score: 0.62 },
      { value: 'L', label: 'Local', score: 0.55 },
      { value: 'P', label: 'Physical', score: 0.20 },
    ],
  },
  {
    key: 'AC', label: 'Attack Complexity',
    options: [
      { value: 'L', label: 'Low', score: 0.77 },
      { value: 'H', label: 'High', score: 0.44 },
    ],
  },
  {
    key: 'PR', label: 'Privileges Required',
    options: [
      { value: 'N', label: 'None', score: 0.85 },
      { value: 'L', label: 'Low', score: 0.62 },
      { value: 'H', label: 'High', score: 0.27 },
    ],
  },
  {
    key: 'UI', label: 'User Interaction',
    options: [
      { value: 'N', label: 'None', score: 0.85 },
      { value: 'R', label: 'Required', score: 0.62 },
    ],
  },
  {
    key: 'C', label: 'Confidentiality',
    options: [
      { value: 'H', label: 'High', score: 0.56 },
      { value: 'L', label: 'Low', score: 0.22 },
      { value: 'N', label: 'None', score: 0.00 },
    ],
  },
  {
    key: 'I', label: 'Integrity',
    options: [
      { value: 'H', label: 'High', score: 0.56 },
      { value: 'L', label: 'Low', score: 0.22 },
      { value: 'N', label: 'None', score: 0.00 },
    ],
  },
  {
    key: 'A', label: 'Availability',
    options: [
      { value: 'H', label: 'High', score: 0.56 },
      { value: 'L', label: 'Low', score: 0.22 },
      { value: 'N', label: 'None', score: 0.00 },
    ],
  },
]

// ---------------------------------------------------------------------------
// AI-Specific Factors
// ---------------------------------------------------------------------------

interface AIFactor {
  key: string
  label: string
  description: string
  options: { value: number; label: string }[]
}

const AI_FACTORS: AIFactor[] = [
  {
    key: 'modelImpact', label: 'Model Impact',
    description: 'How much does this vulnerability affect the model behavior?',
    options: [
      { value: 0, label: 'None' },
      { value: 0.3, label: 'Minor — cosmetic output changes' },
      { value: 0.6, label: 'Moderate — safety bypass possible' },
      { value: 0.8, label: 'Major — full model compromise' },
      { value: 1.0, label: 'Critical — persistent model corruption' },
    ],
  },
  {
    key: 'dataSensitivity', label: 'Data Sensitivity',
    description: 'What type of data can be accessed or leaked?',
    options: [
      { value: 0, label: 'None' },
      { value: 0.2, label: 'Public data only' },
      { value: 0.5, label: 'Internal business data' },
      { value: 0.8, label: 'PII or credentials' },
      { value: 1.0, label: 'Training data or model weights' },
    ],
  },
  {
    key: 'scale', label: 'Scale of Impact',
    description: 'How many users or systems are affected?',
    options: [
      { value: 0, label: 'None' },
      { value: 0.2, label: 'Single user session' },
      { value: 0.5, label: 'Multiple users' },
      { value: 0.8, label: 'All users of the model' },
      { value: 1.0, label: 'Cross-model or cross-platform' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Score Calculations
// ---------------------------------------------------------------------------

function calculateCVSSBase(selections: Record<string, string>): number {
  const metrics = CVSS_METRICS.reduce((acc, metric) => {
    const selected = metric.options.find(o => o.value === selections[metric.key])
    acc[metric.key] = selected?.score ?? 0
    return acc
  }, {} as Record<string, number>)

  // Simplified CVSS 3.1 base score calculation (scope unchanged path only)
  const impactBase = 1 - ((1 - metrics.C) * (1 - metrics.I) * (1 - metrics.A))
  const impact = 6.42 * impactBase
  const exploitability = 8.22 * metrics.AV * metrics.AC * metrics.PR * metrics.UI

  if (impact <= 0) return 0

  const baseScore = Math.min(impact + exploitability, 10)
  return Math.round(baseScore * 10) / 10
}

function calculateAIFactor(aiSelections: Record<string, number>): number {
  const values = AI_FACTORS.map(f => aiSelections[f.key] ?? 0)
  if (values.length === 0) return 0
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return Math.round(avg * 100) / 100
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AISeverityCalculatorProps {
  onScoreChange?: (cvss: number, aiFactor: number, finalScore: number) => void
  initialCvss?: Record<string, string>
  initialAi?: Record<string, number>
  className?: string
}

export function AISeverityCalculator({
  onScoreChange,
  initialCvss,
  initialAi,
  className,
}: AISeverityCalculatorProps) {
  const [cvssSelections, setCvssSelections] = useState<Record<string, string>>(
    initialCvss ?? Object.fromEntries(CVSS_METRICS.map(m => [m.key, m.options[0].value]))
  )
  const [aiSelections, setAiSelections] = useState<Record<string, number>>(
    initialAi ?? Object.fromEntries(AI_FACTORS.map(f => [f.key, 0]))
  )
  const [showCvssDetails, setShowCvssDetails] = useState(true)
  const [showAiDetails, setShowAiDetails] = useState(true)

  const cvssScore = useMemo(() => calculateCVSSBase(cvssSelections), [cvssSelections])
  const aiFactorScore = useMemo(() => calculateAIFactor(aiSelections), [aiSelections])
  const finalScore = useMemo(() => {
    const score = (cvssScore * 0.7) + (aiFactorScore * 10 * 0.3)
    return Math.round(Math.min(score, 10) * 10) / 10
  }, [cvssScore, aiFactorScore])

  const onScoreChangeRef = useRef(onScoreChange)
  useEffect(() => { onScoreChangeRef.current = onScoreChange })

  useEffect(() => {
    onScoreChangeRef.current?.(cvssScore, aiFactorScore, finalScore)
  }, [cvssScore, aiFactorScore, finalScore])

  const handleCvssChange = useCallback((key: string, value: string) => {
    setCvssSelections(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleAiChange = useCallback((key: string, value: number) => {
    setAiSelections(prev => ({ ...prev, [key]: value }))
  }, [])

  const getSeverityLabel = (score: number): { label: string; color: string } => {
    if (score >= 9.0) return { label: 'Critical', color: 'var(--danger)' }
    if (score >= 7.0) return { label: 'High', color: 'var(--severity-high)' }
    if (score >= 4.0) return { label: 'Medium', color: 'var(--warning)' }
    if (score > 0) return { label: 'Low', color: 'var(--success)' }
    return { label: 'None', color: 'var(--muted-foreground)' }
  }

  const severity = getSeverityLabel(finalScore)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Score Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">CVSS Base</span>
          </div>
          <p className="text-lg font-bold">{cvssScore}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Brain className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">AI Factor</span>
          </div>
          <p className="text-lg font-bold">{aiFactorScore}</p>
        </div>
        <div className="p-3 rounded-lg text-center" style={{
          backgroundColor: `color-mix(in srgb, ${severity.color} 10%, transparent)`,
          borderWidth: '1px',
          borderColor: `color-mix(in srgb, ${severity.color} 30%, transparent)`,
        }}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Calculator className="h-3.5 w-3.5" style={{ color: severity.color }} aria-hidden="true" />
            <span className="text-xs" style={{ color: severity.color }}>Final Score</span>
          </div>
          <p className="text-lg font-bold" style={{ color: severity.color }}>{finalScore}</p>
          <p className="text-[10px] font-medium" style={{ color: severity.color }}>{severity.label}</p>
        </div>
      </div>

      {/* Formula */}
      <p className="text-[10px] text-muted-foreground text-center font-mono">
        Final = (CVSS × 0.7) + (AI Factor × 10 × 0.3)
      </p>

      {/* CVSS Base Metrics */}
      <div>
        <button
          onClick={() => setShowCvssDetails(!showCvssDetails)}
          className="flex items-center gap-2 w-full text-left text-sm font-semibold py-2"
          aria-expanded={showCvssDetails}
        >
          <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          CVSS Base Metrics
          <ChevronDown className={cn('h-4 w-4 ml-auto text-muted-foreground motion-safe:transition-transform', showCvssDetails && 'rotate-180')} aria-hidden="true" />
        </button>
        {showCvssDetails && (
          <div className="space-y-3 pl-6">
            {CVSS_METRICS.map(metric => (
              <div key={metric.key} className="space-y-1">
                <label className="text-xs font-medium">{metric.label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {metric.options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleCvssChange(metric.key, opt.value)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium min-h-[32px]',
                        'border motion-safe:transition-colors',
                        cvssSelections[metric.key] === opt.value
                          ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                          : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-tertiary)]',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI-Specific Factors */}
      <div>
        <button
          onClick={() => setShowAiDetails(!showAiDetails)}
          className="flex items-center gap-2 w-full text-left text-sm font-semibold py-2"
          aria-expanded={showAiDetails}
        >
          <Brain className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          AI-Specific Risk Factors
          <ChevronDown className={cn('h-4 w-4 ml-auto text-muted-foreground motion-safe:transition-transform', showAiDetails && 'rotate-180')} aria-hidden="true" />
        </button>
        {showAiDetails && (
          <div className="space-y-4 pl-6">
            {AI_FACTORS.map(factor => (
              <div key={factor.key} className="space-y-1.5">
                <label className="text-xs font-medium">{factor.label}</label>
                <p className="text-[10px] text-muted-foreground">{factor.description}</p>
                <select
                  value={aiSelections[factor.key] ?? 0}
                  onChange={(e) => handleAiChange(factor.key, Number(e.target.value))}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm min-h-[40px]',
                    'bg-[var(--bg-primary)] border border-[var(--border)]',
                    'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
                  )}
                  aria-label={factor.label}
                >
                  {factor.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
