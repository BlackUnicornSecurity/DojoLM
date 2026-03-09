'use client'

/**
 * File: BattleLogExporter.tsx
 * Purpose: Dialog with 3 export options — Push to DNA, Download Training Set, Download Report
 * Story: 19.2 — Battle Log Exporter Component
 *
 * Accessible from LiveMatchView results + ArenaBrowser detail.
 * Shows match summary, loading states, success confirmation.
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  X, Download, Dna, FileText, Check, Loader2, AlertTriangle,
} from 'lucide-react'
import type { ArenaMatch } from '@/lib/arena-types'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

// ===========================================================================
// Types
// ===========================================================================

interface BattleLogExporterProps {
  match: ArenaMatch
  open: boolean
  onClose: () => void
}

type ExportFormat = 'dna' | 'training' | 'markdown'

interface ExportState {
  loading: ExportFormat | null
  success: ExportFormat | null
  error: string | null
  vectorCount: number | null
}

// ===========================================================================
// Component
// ===========================================================================

export function BattleLogExporter({ match, open, onClose }: BattleLogExporterProps) {
  const [state, setState] = useState<ExportState>({
    loading: null,
    success: null,
    error: null,
    vectorCount: null,
  })

  const handleExport = useCallback(async (format: ExportFormat) => {
    setState({ loading: format, success: null, error: null, vectorCount: null })

    try {
      const response = await fetchWithAuth('/api/arena/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, format }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Export failed' }))
        setState({ loading: null, success: null, error: err.error ?? 'Export failed', vectorCount: null })
        return
      }

      if (format === 'dna') {
        const data = await response.json()
        setState({
          loading: null,
          success: 'dna',
          error: null,
          vectorCount: data.vectorCount ?? 0,
        })
      } else {
        // File download — read blob and trigger download
        const blob = await response.blob()
        const ext = format === 'training' ? 'jsonl' : 'md'
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `match-${match.id.slice(0, 8)}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setState({ loading: null, success: format, error: null, vectorCount: null })
      }
    } catch {
      setState({ loading: null, success: null, error: 'Network error during export', vectorCount: null })
    }
  }, [match.id])

  const resetState = useCallback(() => {
    setState({ loading: null, success: null, error: null, vectorCount: null })
  }, [])

  if (!open) return null

  const successfulRounds = match.rounds.filter(r => r.injectionSuccess >= 0.5).length
  const totalRounds = match.rounds.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Export Battle Log"
    >
      <Card className="w-full max-w-md mx-4 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Export Battle Log</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close export dialog"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Match Summary */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Badge variant="outline" className="text-xs">
              {match.config.gameMode}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {match.config.attackMode}
            </Badge>
            <span>{totalRounds} rounds</span>
            {successfulRounds > 0 && (
              <span className="text-[var(--warning)]">
                {successfulRounds} injections
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Error message */}
          {state.error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Success message */}
          {state.success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-sm">
              <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                {state.success === 'dna'
                  ? `${state.vectorCount} vectors pushed to DNA pipeline`
                  : state.success === 'training'
                    ? 'Training data downloaded'
                    : 'Match report downloaded'}
              </span>
            </div>
          )}

          {/* Export Options */}
          <ExportOption
            icon={<Dna className="w-5 h-5" aria-hidden="true" />}
            title="Push to DNA"
            description="Export discovered vectors to the Amaterasu DNA intelligence pipeline"
            onClick={() => { resetState(); void handleExport('dna') }}
            loading={state.loading === 'dna'}
            disabled={state.loading !== null}
            vectorHint={successfulRounds > 0 ? `${successfulRounds} vectors` : 'No vectors found'}
          />

          <ExportOption
            icon={<Download className="w-5 h-5" aria-hidden="true" />}
            title="Download Training Set"
            description="JSONL file with prompt/response pairs for model training"
            onClick={() => { resetState(); void handleExport('training') }}
            loading={state.loading === 'training'}
            disabled={state.loading !== null}
          />

          <ExportOption
            icon={<FileText className="w-5 h-5" aria-hidden="true" />}
            title="Download Report"
            description="Markdown match report with configuration, rounds, and statistics"
            onClick={() => { resetState(); void handleExport('markdown') }}
            loading={state.loading === 'markdown'}
            disabled={state.loading !== null}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ===========================================================================
// Export Option Button
// ===========================================================================

function ExportOption({
  icon,
  title,
  description,
  onClick,
  loading,
  disabled,
  vectorHint,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  loading: boolean
  disabled: boolean
  vectorHint?: string
}) {
  return (
    <button
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-xl border border-[var(--border)]',
        'text-left motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
        disabled && !loading
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] cursor-pointer',
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
    >
      <div className="flex-shrink-0 mt-0.5 text-[var(--bu-electric)]">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">{title}</span>
          {vectorHint && (
            <span className="text-xs text-muted-foreground">{vectorHint}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  )
}
