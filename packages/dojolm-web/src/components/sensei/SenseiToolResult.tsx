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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SenseiToolResultProps {
  readonly tool: string
  readonly success: boolean
  readonly data: unknown
  readonly error?: string
  readonly durationMs: number
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
          renderToolData(tool, data)
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
// Specialized renderers
// ---------------------------------------------------------------------------

function renderToolData(tool: string, data: unknown): React.ReactNode {
  if (data === null || data === undefined) {
    return <p className="text-xs text-[var(--text-tertiary)]">No data returned</p>
  }

  switch (tool) {
    case 'scan_text':
    case 'scan_format':
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
    default:
      return renderGeneric(data)
  }
}

// --- Scan results ---
function renderScanResult(data: unknown): React.ReactNode {
  const d = data as Record<string, unknown>
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
      {models.map((m: Record<string, unknown>, i: number) => (
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
  const d = data as Record<string, unknown>
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
  const d = data as Record<string, unknown>
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
  const d = data as Record<string, unknown>
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
  const d = data as Record<string, unknown>
  const frameworks = Array.isArray(d.frameworks) ? d.frameworks : []

  if (frameworks.length === 0) return renderGeneric(data)

  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {frameworks.map((f: Record<string, unknown>, i: number) => {
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
