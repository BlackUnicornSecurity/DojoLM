/**
 * File: AttackLog.tsx
 * Purpose: Log viewer for attack events (plain text only per SME amendment)
 * Story: S73 - Atemi Lab Dashboard
 * Index:
 * - AttackLogEntry interface (line 18)
 * - MOCK_LOG_ENTRIES (line 29)
 * - severityFilterConfig (line 101)
 * - AttackLogProps interface (line 113)
 * - AttackLog component (line 119)
 */

'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { ScrollText, Filter } from 'lucide-react'
import { CrossModuleActions } from '@/components/ui/CrossModuleActions'
import { toEcosystemSeverity } from '@/lib/ecosystem-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttackLogEntry {
  id: string
  timestamp: string
  attackType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
}

// ---------------------------------------------------------------------------
// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
// ---------------------------------------------------------------------------

const MOCK_LOG_ENTRIES: AttackLogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-03-03T10:15:32.123Z',
    attackType: 'capability-spoofing',
    severity: 'high',
    message: 'MCP capability spoofing attempt detected - server claimed unsupported tool permissions',
  },
  {
    id: 'log-002',
    timestamp: '2026-03-03T10:15:28.456Z',
    attackType: 'tool-poisoning',
    severity: 'critical',
    message: 'Tool poisoning payload injected via tool description field - malicious instructions embedded',
  },
  {
    id: 'log-003',
    timestamp: '2026-03-03T10:14:55.789Z',
    attackType: 'vector-db-poisoning',
    severity: 'high',
    message: 'Vector DB namespace traversal attempted via encoded path separator in collection name',
  },
  {
    id: 'log-004',
    timestamp: '2026-03-03T10:14:12.321Z',
    attackType: 'browser-exploitation',
    severity: 'medium',
    message: 'Browser tool returned page with embedded prompt injection in DOM content',
  },
  {
    id: 'log-005',
    timestamp: '2026-03-03T10:13:45.654Z',
    attackType: 'notification-flood',
    severity: 'low',
    message: 'Notification flood test - 50 progress notifications sent in 100ms burst',
  },
  {
    id: 'log-006',
    timestamp: '2026-03-03T10:13:02.987Z',
    attackType: 'prompt-injection',
    severity: 'critical',
    message: 'Prompt injection via MCP tool result - system instruction override attempted in tool response',
  },
  {
    id: 'log-007',
    timestamp: '2026-03-03T10:12:30.111Z',
    attackType: 'api-exploitation',
    severity: 'medium',
    message: 'API tool SSRF attempt - internal metadata endpoint requested via fetch tool',
  },
  {
    id: 'log-008',
    timestamp: '2026-03-03T10:11:55.222Z',
    attackType: 'filesystem-exploitation',
    severity: 'high',
    message: 'Filesystem tool path traversal - attempted read of /etc/passwd via ../ encoding',
  },
  {
    id: 'log-009',
    timestamp: '2026-03-03T10:11:20.333Z',
    attackType: 'search-poisoning',
    severity: 'medium',
    message: 'Search tool returned SEO-poisoned result with embedded prompt injection in snippet',
  },
  {
    id: 'log-010',
    timestamp: '2026-03-03T10:10:45.444Z',
    attackType: 'cross-server-leak',
    severity: 'high',
    message: 'Cross-server context leak - tool on server B accessed conversation context from server A',
  },
  {
    id: 'log-011',
    timestamp: '2026-03-03T10:10:10.555Z',
    attackType: 'uri-traversal',
    severity: 'medium',
    message: 'URI traversal in MCP resource request - attempted access to resource://../../config',
  },
  {
    id: 'log-012',
    timestamp: '2026-03-03T10:09:33.666Z',
    attackType: 'model-exploitation',
    severity: 'low',
    message: 'Model extraction probe detected - systematic sampling of decision boundaries',
  },
]

// ---------------------------------------------------------------------------
// Severity filter configuration
// ---------------------------------------------------------------------------

type SeverityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical'

const severityFilterConfig: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const severityBadgeVariant = {
  low: 'low' as const,
  medium: 'medium' as const,
  high: 'high' as const,
  critical: 'critical' as const,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AttackLogProps {
  /** Optional additional CSS classes */
  className?: string
}

/**
 * AttackLog
 *
 * Scrollable log viewer for attack events.
 * All log entries are rendered as PLAIN TEXT only (no HTML parsing)
 * per the SME amendment to prevent XSS through log injection.
 *
 * Features:
 * - Filterable by severity level
 * - Scrollable container with custom scrollbar
 * - Each entry shows: timestamp, attack type, severity badge, message
 * - Uses mock data (actual API integration deferred to P8)
 */
export function AttackLog({ className }: AttackLogProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all')

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return MOCK_LOG_ENTRIES
    return MOCK_LOG_ENTRIES.filter((entry) => entry.severity === filter)
  }, [filter])

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header with filter */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ScrollText
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Attack Log
          </h3>
          <span className="text-xs text-[var(--text-tertiary)]">
            ({filteredEntries.length} entries)
          </span>
        </div>

        {/* Severity filter buttons */}
        <div className="flex items-center gap-1" role="group" aria-label="Filter log by severity">
          <Filter
            className="h-3.5 w-3.5 text-[var(--text-tertiary)] mr-1"
            aria-hidden="true"
          />
          {severityFilterConfig.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded-full',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]',
                filter === opt.value
                  ? 'bg-[var(--dojo-primary)] text-white'
                  : 'bg-[var(--bg-quaternary)] text-muted-foreground hover:bg-[var(--bg-tertiary)]',
              )}
              aria-label={`Filter by ${opt.label} severity`}
              aria-pressed={filter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries - scrollable */}
      <ScrollArea className="h-[400px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="p-3 space-y-1" role="log" aria-label="Attack event log">
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
              No log entries match the current filter.
            </p>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'flex flex-col gap-1 p-2 rounded-md',
                  'hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                )}
              >
                {/* Top row: timestamp + attack type + severity */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] flex-shrink-0">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {entry.attackType}
                  </span>
                  <Badge
                    variant={severityBadgeVariant[entry.severity]}
                    className="text-[9px] px-1.5 py-0 leading-tight"
                  >
                    {entry.severity}
                  </Badge>
                </div>
                {/* Message - plain text only (SME amendment) */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-[var(--foreground)] leading-relaxed pl-0 flex-1">
                    {entry.message}
                  </p>
                  <CrossModuleActions
                    sourceModule="atemi"
                    title={entry.attackType}
                    description={entry.message}
                    severity={toEcosystemSeverity(entry.severity)}
                    variant="dropdown"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0')
  } catch {
    return iso
  }
}
