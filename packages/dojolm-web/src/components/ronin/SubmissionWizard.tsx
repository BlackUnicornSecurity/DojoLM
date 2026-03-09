/**
 * File: SubmissionWizard.tsx
 * Purpose: 4-step submission wizard for creating bug bounty submissions
 * Story: NODA-3 Story 10.3
 * Index:
 * - WizardStep type (line 16)
 * - SubmissionWizardProps (line 18)
 * - SubmissionWizard component (line 26)
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, ArrowRight, ArrowLeft, Check, FileText, Shield, Brain, Eye } from 'lucide-react'
import { SEED_PROGRAMS } from '@/lib/data/ronin-seed-programs'
import type { BountySubmission } from '@/lib/data/ronin-seed-programs'
import { AISeverityCalculator } from './AISeverityCalculator'
import { safeUUID } from '@/lib/utils'

type WizardStep = 0 | 1 | 2 | 3

interface SubmissionWizardProps {
  onSave: (submission: BountySubmission) => void
  onClose: () => void
  initialProgramId?: string
}

const STEP_LABELS = [
  { label: 'Program & Title', icon: FileText },
  { label: 'Evidence', icon: Shield },
  { label: 'Severity', icon: Brain },
  { label: 'Review & Submit', icon: Eye },
]

export function SubmissionWizard({ onSave, onClose, initialProgramId }: SubmissionWizardProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const [step, setStep] = useState<WizardStep>(0)

  // Step 1: Program + Title
  const [programId, setProgramId] = useState(initialProgramId ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Step 2: Evidence
  const [evidence, setEvidence] = useState<string[]>([''])

  // Step 3: Severity
  const [cvssScore, setCvssScore] = useState(0)
  const [aiFactorScore, setAiFactorScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)

  const selectedProgram = SEED_PROGRAMS.find(p => p.id === programId)

  const canAdvance = (s: WizardStep): boolean => {
    switch (s) {
      case 0: return Boolean(programId && title.trim() && description.trim())
      case 1: return evidence.some(e => e.trim().length > 0)
      case 2: return finalScore > 0
      case 3: return true
      default: return false
    }
  }

  const handleScoreChange = useCallback((cvss: number, ai: number, final_: number) => {
    setCvssScore(cvss)
    setAiFactorScore(ai)
    setFinalScore(final_)
  }, [])

  const getSeverityFromScore = (score: number): BountySubmission['severity'] => {
    if (score >= 9.0) return 'critical'
    if (score >= 7.0) return 'high'
    if (score >= 4.0) return 'medium'
    if (score > 0) return 'low'
    return 'info'
  }

  const handleSubmit = useCallback((asDraft: boolean) => {
    const now = new Date().toISOString()
    const submission: BountySubmission = {
      id: safeUUID(),
      programId,
      programName: selectedProgram?.name ?? 'Unknown Program',
      title: title.trim().slice(0, 500),
      status: asDraft ? 'draft' : 'submitted',
      severity: getSeverityFromScore(finalScore),
      cvssScore,
      aiFactorScore,
      finalScore,
      evidence: evidence.filter(e => e.trim()).map(e => e.trim().slice(0, 2000)),
      description: description.trim().slice(0, 5000),
      createdAt: now,
      updatedAt: now,
      payout: null,
    }
    onSave(submission)
  }, [programId, selectedProgram, title, description, evidence, cvssScore, aiFactorScore, finalScore, onSave])

  const addEvidenceField = useCallback(() => {
    if (evidence.length < 10) {
      setEvidence(prev => [...prev, ''])
    }
  }, [evidence.length])

  const updateEvidence = useCallback((index: number, value: string) => {
    setEvidence(prev => prev.map((e, i) => i === index ? value : e))
  }, [])

  const removeEvidence = useCallback((index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          'relative w-full max-w-2xl max-h-[90vh] mx-4 overflow-hidden',
          'bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-lg',
          'flex flex-col',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-[var(--transition-normal)]',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="New Submission Wizard"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold">New Submission</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center motion-safe:transition-colors"
            aria-label="Close wizard"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-[var(--border)]">
          {STEP_LABELS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isCompleted = i < step
            return (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                  isActive && 'bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]',
                  isCompleted && 'text-[var(--success)]',
                  !isActive && !isCompleted && 'text-muted-foreground',
                )}>
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={cn('flex-1 h-px mx-1', i < step ? 'bg-[var(--success)]' : 'bg-[var(--border)]')} />
                )}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 0: Program & Title */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="wizard-program" className="text-sm font-medium">Bug Bounty Program</label>
                <select
                  id="wizard-program"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm min-h-[44px]',
                    'bg-[var(--bg-primary)] border border-[var(--border)]',
                    'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
                  )}
                >
                  <option value="">Select a program...</option>
                  {SEED_PROGRAMS.filter(p => p.status === 'active').map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.company})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wizard-title" className="text-sm font-medium">Vulnerability Title</label>
                <input
                  id="wizard-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Prompt injection via tool description field"
                  maxLength={500}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm min-h-[44px]',
                    'bg-[var(--bg-primary)] border border-[var(--border)]',
                    'text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wizard-desc" className="text-sm font-medium">Description</label>
                <textarea
                  id="wizard-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the vulnerability, steps to reproduce, and expected vs actual behavior..."
                  maxLength={5000}
                  rows={6}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    'bg-[var(--bg-primary)] border border-[var(--border)]',
                    'text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
                    'resize-y',
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 1: Evidence */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add evidence from NODA test results, scan findings, or manual observations.
              </p>
              {evidence.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    value={item}
                    onChange={(e) => updateEvidence(index, e.target.value)}
                    placeholder={`Evidence ${index + 1}: Paste scan results, test output, or describe observation...`}
                    maxLength={2000}
                    rows={3}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm',
                      'bg-[var(--bg-primary)] border border-[var(--border)]',
                      'text-foreground placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
                      'resize-y',
                    )}
                    aria-label={`Evidence item ${index + 1}`}
                  />
                  {evidence.length > 1 && (
                    <button
                      onClick={() => removeEvidence(index)}
                      className="p-2 text-muted-foreground hover:text-[var(--danger)] self-start min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label={`Remove evidence ${index + 1}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {evidence.length < 10 && (
                <Button variant="outline" size="sm" onClick={addEvidenceField} className="gap-2">
                  + Add Evidence
                </Button>
              )}
            </div>
          )}

          {/* Step 2: Severity */}
          {step === 2 && (
            <AISeverityCalculator onScoreChange={handleScoreChange} />
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Review Submission</h3>
              <div className="space-y-3 p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <div>
                  <span className="text-xs text-muted-foreground">Program</span>
                  <p className="text-sm font-medium">{selectedProgram?.name ?? 'Not selected'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Title</span>
                  <p className="text-sm font-medium">{title || 'Not set'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Description</span>
                  <p className="text-sm text-muted-foreground line-clamp-3">{description || 'Not set'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Evidence Items</span>
                  <p className="text-sm font-medium">{evidence.filter(e => e.trim()).length}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">CVSS</span>
                    <p className="text-sm font-bold">{cvssScore}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">AI Factor</span>
                    <p className="text-sm font-bold">{aiFactorScore}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Final Score</span>
                    <p className="text-sm font-bold text-[var(--dojo-primary)]">{finalScore}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Severity</span>
                    <p className="text-sm font-bold capitalize">{getSeverityFromScore(finalScore)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-5 border-t border-[var(--border)]">
          <div>
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((step - 1) as WizardStep)} className="gap-2">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 3 && (
              <Button variant="outline" size="sm" onClick={() => handleSubmit(true)}>
                Save as Draft
              </Button>
            )}
            {step < 3 ? (
              <Button
                size="sm"
                onClick={() => setStep((step + 1) as WizardStep)}
                disabled={!canAdvance(step)}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleSubmit(false)}
                className="gap-2"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Submit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
