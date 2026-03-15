/**
 * File: SubmissionDetail.tsx
 * Purpose: Detailed submission view with status timeline
 * Story: NODA-3 Story 10.3
 * Index:
 * - SubmissionDetailProps (line 12)
 * - SubmissionDetail component (line 19)
 */

'use client'

import { useEffect } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { X, Calendar, Shield, Brain, Calculator, FileText, CheckCircle, Clock, DollarSign, XCircle, Filter } from 'lucide-react'
import type { BountySubmission, SubmissionStatus } from '@/lib/data/ronin-seed-programs'

interface SubmissionDetailProps {
  submission: BountySubmission
  onClose: () => void
}

const STATUS_TIMELINE: { status: SubmissionStatus; label: string; icon: typeof FileText }[] = [
  { status: 'draft', label: 'Draft', icon: FileText },
  { status: 'submitted', label: 'Submitted', icon: Clock },
  { status: 'triaged', label: 'Triaged', icon: Filter },
  { status: 'validated', label: 'Validated', icon: CheckCircle },
  { status: 'paid', label: 'Paid', icon: DollarSign },
]

const STATUS_ORDER: Record<SubmissionStatus, number> = {
  draft: 0,
  submitted: 1,
  triaged: 2,
  validated: 3,
  paid: 4,
  rejected: -1,
}

export function SubmissionDetail({ submission, onClose }: SubmissionDetailProps) {
  const currentStep = STATUS_ORDER[submission.status]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[85vh] mx-4 overflow-y-auto',
          'bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-lg',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-[var(--transition-normal)]',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-detail-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0">
            <h2 id="sub-detail-title" className="text-lg font-bold">{submission.title}</h2>
            <p className="text-sm text-muted-foreground">{submission.programName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center motion-safe:transition-colors"
            aria-label="Close submission detail"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Status Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Status</h3>
            {submission.status === 'rejected' ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20">
                <XCircle className="h-4 w-4 text-[var(--danger)]" aria-hidden="true" />
                <span className="text-sm font-medium text-[var(--danger)]">Rejected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {STATUS_TIMELINE.map((s, i) => {
                  const Icon = s.icon
                  const isActive = i === currentStep
                  const isCompleted = i < currentStep
                  return (
                    <div key={s.status} className="flex items-center flex-1">
                      <div className={cn(
                        'flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium',
                        isActive && 'bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]',
                        isCompleted && 'text-[var(--success)]',
                        !isActive && !isCompleted && 'text-muted-foreground',
                      )}>
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        <span className="hidden sm:inline">{s.label}</span>
                      </div>
                      {i < STATUS_TIMELINE.length - 1 && (
                        <div className={cn('flex-1 h-px mx-0.5', i < currentStep ? 'bg-[var(--success)]' : 'bg-[var(--border)]')} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{submission.description}</p>
          </div>

          {/* Scores */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Severity Assessment</h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-center">
                <Shield className="h-3 w-3 mx-auto text-muted-foreground mb-1" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">CVSS</p>
                <p className="text-sm font-bold">{submission.cvssScore}</p>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-center">
                <Brain className="h-3 w-3 mx-auto text-muted-foreground mb-1" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">AI Factor</p>
                <p className="text-sm font-bold">{submission.aiFactorScore}</p>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-center">
                <Calculator className="h-3 w-3 mx-auto text-muted-foreground mb-1" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">Final</p>
                <p className="text-sm font-bold text-[var(--dojo-primary)]">{submission.finalScore}</p>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-center">
                <p className="text-xs text-muted-foreground">Severity</p>
                <Badge variant="outline" className="text-[10px] capitalize mt-1">{submission.severity}</Badge>
              </div>
            </div>
          </div>

          {/* Evidence */}
          {submission.evidence.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Evidence ({submission.evidence.length})</h3>
              <div className="space-y-2">
                {submission.evidence.map((e, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                    {e}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payout */}
          {submission.payout != null && submission.payout > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20">
              <DollarSign className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
              <span className="text-sm font-bold text-[var(--success)]">${submission.payout.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">reward paid</span>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <span>Created: {formatDate(submission.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <span>Updated: {formatDate(submission.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
