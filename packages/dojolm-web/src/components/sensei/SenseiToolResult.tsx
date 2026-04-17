/**
 * File: SenseiToolResult.tsx
 * Purpose: Rich rendering of tool execution results in Sensei chat
 * Story: SH7.1
 * Index:
 * - SenseiToolResultProps (line 14)
 * - SenseiToolResultCard component (line 22)
 * - Renderers: scan (line 66), models (line 100), guard (line 126), stats (line 150), generic (line 170)
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  Shield,
  Eye,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import type { NavId } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SenseiToolResultProps {
  readonly tool: string
  readonly success: boolean
  readonly data: unknown
  readonly error?: string
  readonly durationMs: number
  readonly onNavigate?: (module: NavId) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SenseiToolResultCard({
  tool,
  success,
  data,
  error,
  durationMs,
  onNavigate,
}: SenseiToolResultProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-tertiary)]">
        <div className="flex items-center gap-2">
          {success ? (
            <CheckCircle className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
          )}
          <span className="font-medium text-[var(--foreground)]">{formatToolName(tool)}</span>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {durationMs}ms
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {!success && error ? (
          <p className="text-red-400 text-xs">{error}</p>
        ) : (
          renderToolData(tool, data, onNavigate)
        )}
      </div>

      {/* Collapsible raw data */}
      <div className="border-t border-[var(--border-subtle)]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-3 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={cn(
              'w-3 h-3 motion-safe:transition-transform',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
          {expanded ? 'Hide raw data' : 'Show raw data'}
        </button>
        {expanded && (
          <pre className="px-3 pb-2 text-xs font-mono text-[var(--text-secondary)] overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tool name formatter
// ---------------------------------------------------------------------------

function formatToolName(tool: string): string {
  return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safe cast — returns null if data is not a plain object. */
function asRecord(data: unknown): Record<string, unknown> | null {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  return null
}

/** Filter an unknown array to only plain objects. */
function filterRecords(arr: unknown[]): Record<string, unknown>[] {
  return arr.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  )
}

// ---------------------------------------------------------------------------
// Specialized renderers
// ---------------------------------------------------------------------------

function renderToolData(tool: string, data: unknown, onNavigate?: (module: NavId) => void): React.ReactNode {
  if (data === null || data === undefined) {
    return <p className="text-xs text-[var(--text-tertiary)]">No data returned</p>
  }

  switch (tool) {
    case 'scan_text':
    case 'scan_format':
    case 'run_rag_pipeline_test':
      return renderScanResult(data)
    case 'list_models':
      return renderModelList(data)
    case 'get_guard_status':
      return renderGuardStatus(data)
    case 'get_stats':
      return renderStats(data)
    case 'get_fingerprint_results':
    case 'fingerprint':
      return renderFingerprint(data)
    case 'get_compliance':
      return renderCompliance(data)
    case 'navigate_to':
      return renderNavigate(data, onNavigate)
    case 'explain_feature':
      return renderExplain(data, onNavigate)
    case 'create_arena_match':
      return renderArenaCreated(data)
    case 'list_arena_matches':
      return renderArenaList(data)
    case 'get_warriors':
      return renderWarriors(data)
    case 'query_dna':
      return renderDnaQuery(data)
    case 'analyze_dna':
      return renderDnaAnalysis(data)
    case 'generate_attack':
      return renderAttackGenerated(data)
    case 'judge_response':
      return renderJudgeResult(data)
    case 'run_orchestrator':
    case 'run_agentic_test':
      return renderRunQueued(data)
    case 'list_campaigns':
      return renderCampaignList(data)
    case 'get_results':
    case 'get_guard_audit':
    case 'get_ecosystem_findings':
    case 'get_leaderboard':
      return renderDataTable(data)
    default:
      return renderGeneric(data)
  }
}

// --- Scan results ---
function renderScanResult(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const findings = Array.isArray(d.findings) ? d.findings : []
  const verdict = typeof d.verdict === 'string' ? d.verdict : 'UNKNOWN'

  const severityCounts: Record<string, number> = {}
  for (const f of findings) {
    const sev = typeof (f as Record<string, unknown>).severity === 'string'
      ? ((f as Record<string, unknown>).severity as string)
      : 'UNKNOWN'
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={cn(
          'px-2 py-0.5 rounded text-xs font-bold uppercase',
          verdict === 'BLOCK' && 'bg-red-500/20 text-red-400',
          verdict === 'WARN' && 'bg-amber-500/20 text-amber-400',
          verdict === 'ALLOW' && 'bg-emerald-500/20 text-emerald-400',
          !['BLOCK', 'WARN', 'ALLOW'].includes(verdict) && 'bg-gray-500/20 text-gray-400',
        )}>
          {verdict}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {findings.length} finding{findings.length !== 1 ? 's' : ''}
        </span>
      </div>
      {Object.entries(severityCounts).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(severityCounts).map(([sev, count]) => (
            <span
              key={sev}
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                sev === 'CRITICAL' && 'bg-red-500/20 text-red-400',
                sev === 'HIGH' && 'bg-orange-500/20 text-orange-400',
                sev === 'MEDIUM' && 'bg-amber-500/20 text-amber-400',
                sev === 'LOW' && 'bg-blue-500/20 text-blue-400',
                !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(sev) && 'bg-gray-500/20 text-gray-400',
              )}
            >
              {sev}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Model list ---
function renderModelList(data: unknown): React.ReactNode {
  const models = Array.isArray(data) ? data : []
  if (models.length === 0) {
    return <p className="text-xs text-[var(--text-tertiary)]">No models configured</p>
  }
  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {filterRecords(models).map((m, i) => (
        <div key={String(m.id ?? i)} className="flex items-center justify-between text-xs">
          <span className="text-[var(--foreground)] font-medium">{String(m.name ?? m.id ?? 'Unknown')}</span>
          <span className="text-[var(--text-tertiary)]">{String(m.provider ?? '')}</span>
        </div>
      ))}
    </div>
  )
}

// --- Guard status ---
const GUARD_ICONS: Record<string, typeof Shield> = {
  shinobi: Eye,
  samurai: Shield,
  sensei: ShieldAlert,
  hattori: ShieldCheck,
}

function renderGuardStatus(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const mode = typeof d.mode === 'string' ? d.mode : 'unknown'
  const enabled = d.enabled === true
  const GuardIcon = GUARD_ICONS[mode] ?? Shield

  return (
    <div className="flex items-center gap-2">
      <GuardIcon className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
      <span className="text-xs font-medium text-[var(--foreground)] capitalize">{mode}</span>
      <span className={cn(
        'px-1.5 py-0.5 rounded text-[10px] font-medium',
        enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400',
      )}>
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}

// --- Stats ---
function renderStats(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const entries = Object.entries(d).filter(([, v]) => typeof v === 'number' || typeof v === 'string')
  if (entries.length === 0) return renderGeneric(data)

  return (
    <div className="grid grid-cols-2 gap-1">
      {entries.slice(0, 8).map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="text-[var(--text-tertiary)]">{formatToolName(key)}: </span>
          <span className="text-[var(--foreground)] font-medium">{String(value)}</span>
        </div>
      ))}
    </div>
  )
}

// --- Fingerprint ---
function renderFingerprint(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const identity = typeof d.identity === 'string' ? d.identity : null
  const confidence = typeof d.confidence === 'number' ? d.confidence : null

  return (
    <div className="space-y-1">
      {identity && (
        <div className="text-xs">
          <span className="text-[var(--text-tertiary)]">Identity: </span>
          <span className="text-[var(--foreground)] font-medium">{identity}</span>
        </div>
      )}
      {confidence !== null && (
        <div className="text-xs">
          <span className="text-[var(--text-tertiary)]">Confidence: </span>
          <span className="text-[var(--foreground)] font-medium">{(confidence * 100).toFixed(1)}%</span>
        </div>
      )}
      {!identity && !confidence && renderGeneric(data)}
    </div>
  )
}

// --- Compliance ---
function renderCompliance(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const frameworks = Array.isArray(d.frameworks) ? d.frameworks : []

  if (frameworks.length === 0) return renderGeneric(data)

  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {filterRecords(frameworks).map((f, i) => {
        const name = String(f.name ?? 'Framework')
        const coverage = typeof f.coverage === 'number' ? f.coverage : 0
        return (
          <div key={String(f.id ?? i)} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground)]">{name}</span>
              <span className="text-[var(--text-tertiary)]">{Math.round(coverage)}%</span>
            </div>
            <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--primary)] motion-safe:transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, coverage))}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Navigate result ---
function renderNavigate(data: unknown, onNavigate?: (module: NavId) => void): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const moduleName = typeof d.module === 'string' ? d.module : null
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-[var(--text-secondary)]">
        Navigating to{' '}
        <span className="font-medium text-[var(--primary)]">
          {moduleName ? formatToolName(moduleName) : 'module'}
        </span>
      </p>
      {onNavigate && moduleName && (
        <button
          onClick={() => onNavigate(moduleName as NavId)}
          className="px-2 py-1 rounded text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
        >
          Go to {formatToolName(moduleName)} →
        </button>
      )}
    </div>
  )
}

// --- Explain feature ---
function renderExplain(data: unknown, onNavigate?: (module: NavId) => void): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const description = typeof d.description === 'string' ? d.description : ''
  const moduleName = typeof d.module === 'string' ? d.module : null
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap">{description}</p>
      {onNavigate && moduleName && (
        <button
          onClick={() => onNavigate(moduleName as NavId)}
          className="px-2 py-1 rounded text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
        >
          Open {formatToolName(moduleName)} →
        </button>
      )}
    </div>
  )
}

// --- Arena match created ---
function renderArenaCreated(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  return (
    <div className="space-y-1">
      <div className="text-xs">
        <span className="text-[var(--text-tertiary)]">Match ID: </span>
        <span className="text-[var(--foreground)] font-mono font-medium">{String(d.matchId ?? '')}</span>
      </div>
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
        {String(d.status ?? 'pending')}
      </span>
    </div>
  )
}

// --- Arena match list ---
function renderArenaList(data: unknown): React.ReactNode {
  const d = asRecord(data)
  const matches = d && Array.isArray(d.matches) ? d.matches : (Array.isArray(data) ? data : [])
  if (matches.length === 0) return <p className="text-xs text-[var(--text-tertiary)]">No matches found</p>
  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {filterRecords(matches).slice(0, 10).map((m, i) => (
        <div key={String(m.id ?? i)} className="flex items-center justify-between text-xs">
          <span className="text-[var(--foreground)] font-mono">{String(m.id ?? '').slice(0, 8)}</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-medium',
            m.status === 'completed' && 'bg-emerald-500/20 text-emerald-400',
            m.status === 'running' && 'bg-blue-500/20 text-blue-400',
            m.status === 'pending' && 'bg-amber-500/20 text-amber-400',
            m.status === 'aborted' && 'bg-red-500/20 text-red-400',
          )}>
            {String(m.status ?? 'unknown')}
          </span>
        </div>
      ))}
    </div>
  )
}

// --- Warriors leaderboard ---
function renderWarriors(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const warriors = Array.isArray(d.warriors) ? d.warriors : []
  if (warriors.length === 0) return <p className="text-xs text-[var(--text-tertiary)]">No fighters yet</p>
  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {filterRecords(warriors).slice(0, 10).map((w, i) => (
        <div key={String(w.modelId ?? i)} className="flex items-center justify-between text-xs">
          <span className="text-[var(--foreground)] font-medium">{String(w.modelName ?? w.modelId ?? 'Unknown')}</span>
          <span className="text-[var(--text-tertiary)]">
            {String(w.wins ?? 0)}W/{String(w.losses ?? 0)}L — {typeof w.winRate === 'number' ? `${Math.round(w.winRate * 100)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

// --- DNA query ---
function renderDnaQuery(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  // Stats view
  if (d.stats && typeof d.stats === 'object') return renderStats(d.stats)
  // Nodes, families, clusters, timeline
  const items = (d.nodes ?? d.families ?? d.clusters ?? d.timeline) as unknown[] | undefined
  const total = typeof d.total === 'number' ? d.total : (items?.length ?? 0)
  return (
    <div className="space-y-1">
      <p className="text-xs text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--foreground)]">{total}</span> result{total !== 1 ? 's' : ''}
      </p>
      {Array.isArray(items) && filterRecords(items).slice(0, 5).map((item, i) => (
        <div key={String(item.id ?? i)} className="text-xs text-[var(--text-tertiary)] truncate">
          {String(item.content ?? item.id ?? item.name ?? JSON.stringify(item).slice(0, 80))}
        </div>
      ))}
    </div>
  )
}

// --- DNA ablation analysis ---
function renderDnaAnalysis(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const analysis = (d.analysis ?? d) as Record<string, unknown>
  const meta = (d.meta ?? {}) as Record<string, unknown>
  const components = typeof meta.componentCount === 'number' ? meta.componentCount : '?'
  const critical = typeof meta.criticalCount === 'number' ? meta.criticalCount : '?'
  return (
    <div className="space-y-1">
      <div className="flex gap-3 text-xs">
        <div>
          <span className="text-[var(--text-tertiary)]">Components: </span>
          <span className="text-[var(--foreground)] font-medium">{components}</span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Critical: </span>
          <span className="text-red-400 font-medium">{critical}</span>
        </div>
      </div>
      {typeof analysis.baselineScore === 'number' && (
        <div className="text-xs">
          <span className="text-[var(--text-tertiary)]">Baseline Score: </span>
          <span className="text-[var(--foreground)] font-medium">{(analysis.baselineScore as number).toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

// --- Attack generated ---
function renderAttackGenerated(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const attacks = Array.isArray(d.attacks) ? d.attacks : (Array.isArray(d.data) ? d.data : [])
  return (
    <div className="space-y-1">
      <p className="text-xs text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--foreground)]">{attacks.length}</span> attack variant{attacks.length !== 1 ? 's' : ''} generated
      </p>
    </div>
  )
}

// --- Judge result ---
function renderJudgeResult(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const success = d.success === true || d.attackSuccessful === true
  const score = typeof d.score === 'number' ? d.score : (typeof d.confidence === 'number' ? d.confidence : null)
  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'px-2 py-0.5 rounded text-xs font-bold uppercase',
        success ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400',
      )}>
        {success ? 'Attack Succeeded' : 'Attack Blocked'}
      </span>
      {score !== null && (
        <span className="text-xs text-[var(--text-tertiary)]">
          Score: {(score * 100).toFixed(0)}%
        </span>
      )}
    </div>
  )
}

// --- Run queued (orchestrator, agentic) ---
function renderRunQueued(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const inner = (d.data ?? d) as Record<string, unknown>
  return (
    <div className="space-y-1">
      {!!inner.runId && (
        <div className="text-xs">
          <span className="text-[var(--text-tertiary)]">Run ID: </span>
          <span className="text-[var(--foreground)] font-mono">{String(inner.runId).slice(0, 20)}</span>
        </div>
      )}
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400">
        {String(inner.status ?? inner.message ?? 'queued')}
      </span>
    </div>
  )
}

// --- Campaign list ---
function renderCampaignList(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  const campaigns = Array.isArray(d.campaigns) ? d.campaigns : []
  if (campaigns.length === 0) return <p className="text-xs text-[var(--text-tertiary)]">No campaigns found</p>
  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {filterRecords(campaigns).slice(0, 10).map((c, i) => (
        <div key={String(c.id ?? i)} className="flex items-center justify-between text-xs">
          <span className="text-[var(--foreground)] font-medium">{String(c.name ?? 'Untitled')}</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-medium',
            c.status === 'running' && 'bg-blue-500/20 text-blue-400',
            c.status === 'draft' && 'bg-gray-500/20 text-gray-400',
            c.status === 'completed' && 'bg-emerald-500/20 text-emerald-400',
          )}>
            {String(c.status ?? 'unknown')}
          </span>
        </div>
      ))}
    </div>
  )
}

// --- Data table (generic list/table renderer for results, audit, findings, leaderboard) ---
function renderDataTable(data: unknown): React.ReactNode {
  const d = asRecord(data)
  if (!d) return renderGeneric(data)
  // Try to find the main array in common response shapes
  const items = (d.data ?? d.leaderboard ?? d.events ?? d.executions ?? d.findings) as unknown[] | undefined
  const total = typeof d.total === 'number' ? d.total : (typeof (d.meta as Record<string, unknown>)?.total === 'number' ? (d.meta as Record<string, unknown>).total as number : null)

  if (!Array.isArray(items) || items.length === 0) {
    if (total === 0) return <p className="text-xs text-[var(--text-tertiary)]">No results</p>
    return renderGeneric(data)
  }

  return (
    <div className="space-y-1">
      {total !== null && (
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--foreground)]">{total}</span> result{total !== 1 ? 's' : ''}
        </p>
      )}
      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {filterRecords(items as unknown[]).slice(0, 8).map((item, i) => {
          const label = String(item.modelName ?? item.name ?? item.title ?? item.id ?? `#${i + 1}`)
          const detail = item.avgResilienceScore != null
            ? `Score: ${item.avgResilienceScore}`
            : item.severity != null
              ? String(item.severity)
              : item.action != null
                ? String(item.action)
                : ''
          return (
            <div key={String(item.id ?? i)} className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground)] truncate">{label}</span>
              {detail && <span className="text-[var(--text-tertiary)] ml-2">{detail}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Generic fallback ---
function renderGeneric(data: unknown): React.ReactNode {
  if (typeof data === 'string') {
    return <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap">{data}</p>
  }
  const str = JSON.stringify(data, null, 2)
  const truncated = str.length > 500 ? str.slice(0, 500) + '...' : str
  return (
    <pre className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-words">
      {truncated}
    </pre>
  )
}
