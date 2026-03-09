/**
 * File: SubmissionsTab.tsx
 * Purpose: Submissions tab — list submissions and launch wizard
 * Story: NODA-3 Story 10.3
 * Index:
 * - STORAGE_KEY (line 17)
 * - SubmissionsTab component (line 30)
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SubmissionWizard } from './SubmissionWizard'
import { SubmissionDetail } from './SubmissionDetail'
import type { BountySubmission, SubmissionStatus } from '@/lib/data/ronin-seed-programs'
import { Plus, FileText, Clock, CheckCircle, DollarSign, XCircle, Filter } from 'lucide-react'

const STORAGE_KEY = 'noda-ronin-submissions'

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; icon: typeof FileText }> = {
  draft: { label: 'Draft', color: 'var(--muted-foreground)', icon: FileText },
  submitted: { label: 'Submitted', color: 'var(--bu-electric)', icon: Clock },
  triaged: { label: 'Triaged', color: 'var(--warning)', icon: Filter },
  validated: { label: 'Validated', color: 'var(--success)', icon: CheckCircle },
  paid: { label: 'Paid', color: 'var(--dojo-primary)', icon: DollarSign },
  rejected: { label: 'Rejected', color: 'var(--danger)', icon: XCircle },
}

function loadSubmissions(): BountySubmission[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const VALID_SUB_STATUSES = new Set(['draft', 'submitted', 'triaged', 'validated', 'paid', 'rejected'])
    return parsed.filter((s: unknown) => {
      if (!s || typeof s !== 'object') return false
      const sub = s as Record<string, unknown>
      return typeof sub.id === 'string' && typeof sub.title === 'string' && typeof sub.status === 'string' && VALID_SUB_STATUSES.has(sub.status as string)
    })
  } catch {
    return []
  }
}

function saveSubmissions(subs: BountySubmission[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs))
  } catch {
    // Quota or private mode
  }
}

export function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<BountySubmission[]>([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<BountySubmission | null>(null)
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all')

  // Hydrate from localStorage
  useEffect(() => {
    setSubmissions(loadSubmissions())
  }, [])

  const handleSaveSubmission = useCallback((submission: BountySubmission) => {
    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === submission.id)
      const next = idx >= 0
        ? prev.map((s, i) => i === idx ? submission : s)
        : [submission, ...prev]
      saveSubmissions(next)
      return next
    })
    setWizardOpen(false)
  }, [])

  const filteredSubmissions = useMemo(() => {
    if (statusFilter === 'all') return submissions
    return submissions.filter(s => s.status === statusFilter)
  }, [submissions, statusFilter])

  const stats = useMemo(() => {
    const total = submissions.length
    const active = submissions.filter(s => !['rejected', 'paid'].includes(s.status)).length
    const totalPayout = submissions.reduce((sum, s) => sum + (s.payout ?? 0), 0)
    return { total, active, totalPayout }
  }, [submissions])

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{stats.total}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-lg font-bold text-[var(--bu-electric)]">{stats.active}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <p className="text-xs text-muted-foreground">Total Payouts</p>
          <p className="text-lg font-bold text-[var(--success)]">${stats.totalPayout.toLocaleString()}</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | 'all')}
            className={cn(
              'px-3 py-2 rounded-lg text-sm min-h-[40px]',
              'bg-[var(--bg-primary)] border border-[var(--border)]',
              'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
            )}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            {(Object.keys(STATUS_CONFIG) as SubmissionStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          onClick={() => setWizardOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Submission
        </Button>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length > 0 ? (
        <div className="space-y-2">
          {filteredSubmissions.map(sub => {
            const statusMeta = STATUS_CONFIG[sub.status]
            const StatusIcon = statusMeta.icon
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubmission(sub)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]',
                  'bg-card hover:border-[var(--dojo-primary)]/40 text-left',
                  'motion-safe:transition-colors min-h-[56px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                aria-label={`${sub.title} — ${statusMeta.label}`}
              >
                <StatusIcon
                  className="h-4 w-4 shrink-0"
                  style={{ color: statusMeta.color }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.title}</p>
                  <p className="text-xs text-muted-foreground">{sub.programName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${statusMeta.color} 15%, transparent)`,
                      color: statusMeta.color,
                    }}
                  >
                    {statusMeta.label}
                  </span>
                  <span className="text-xs font-mono font-bold">{sub.finalScore}</span>
                  {sub.payout != null && sub.payout > 0 && (
                    <Badge variant="outline" className="text-[10px] text-[var(--success)]">
                      ${sub.payout.toLocaleString()}
                    </Badge>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
          <p className="text-sm font-medium">No submissions yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first submission to start tracking your bug bounty workflow
          </p>
          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="mt-4 gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Submission
          </Button>
        </div>
      )}

      {/* Submission Wizard */}
      {wizardOpen && (
        <SubmissionWizard
          onSave={handleSaveSubmission}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {/* Submission Detail */}
      {selectedSubmission && (
        <SubmissionDetail
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  )
}
