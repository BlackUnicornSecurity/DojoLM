/**
 * File: AuditTrail.tsx
 * Purpose: Audit log viewer with date/action filters. All content rendered as plain text (security).
 * Story: S74
 * Index:
 * - AuditEntry interface (line 16)
 * - AuditTrailProps interface (line 26)
 * - ACTION_TYPES constant (line 31)
 * - ResultBadge component (line 44)
 * - AuditTrail component (line 66)
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { FileText, Filter, RefreshCw, Clock, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/error-state'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

// --- Types ---

interface AuditEntry {
  id: string
  timestamp: string
  action: string
  user: string
  resource: string
  result: string
  details?: string
}

export interface AuditTrailProps {
  className?: string
}

// --- Constants ---

const ACTION_TYPES = [
  'all',
  'scan',
  'compliance_check',
  'gap_assessment',
  'remediation',
  'export',
  'login',
  'config_change',
  'framework_update',
] as const

type ActionType = (typeof ACTION_TYPES)[number]

// --- Result Badge ---

function ResultBadge({ result }: { result: string }) {
  const normalized = result.toLowerCase().trim()

  const styles = {
    pass: 'bg-[var(--success)]/20 text-[var(--success)]',
    success: 'bg-[var(--success)]/20 text-[var(--success)]',
    fail: 'bg-[var(--danger)]/20 text-[var(--danger)]',
    error: 'bg-[var(--danger)]/20 text-[var(--danger)]',
    warning: 'bg-[var(--warning)]/20 text-[var(--warning)]',
    pending: 'bg-[var(--info)]/20 text-[var(--info)]',
    info: 'bg-[var(--info)]/20 text-[var(--info)]',
  } as Record<string, string>

  const style = styles[normalized] ?? 'bg-[var(--bg-quaternary)] text-muted-foreground'

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        style
      )}
    >
      {result}
    </span>
  )
}

// --- Main AuditTrail Component ---

export function AuditTrail({ className }: AuditTrailProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<ActionType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAuditLog = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchWithAuth('/api/audit/log')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch audit log')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const rawEntries = Array.isArray(data) ? data : data.entries ?? data.log ?? []
        const parsed: AuditEntry[] = rawEntries.map(
          (e: Record<string, unknown>, idx: number) => ({
            id: String(e.id ?? `audit-${idx}`),
            timestamp: String(e.timestamp ?? e.time ?? ''),
            action: String(e.action ?? e.type ?? 'unknown'),
            user: String(e.user ?? e.actor ?? 'system'),
            resource: String(e.resource ?? e.target ?? ''),
            result: String(e.result ?? e.status ?? e.outcome ?? 'info'),
            details: e.details ? String(e.details) : undefined,
          })
        )
        setEntries(parsed)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cleanup = fetchAuditLog()
    return cleanup
  }, [fetchAuditLog])

  // --- Filtered entries ---
  const filteredEntries = useMemo(() => {
    let result = entries

    // Action filter
    if (actionFilter !== 'all') {
      result = result.filter(
        (e) => e.action.toLowerCase() === actionFilter.toLowerCase()
      )
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      result = result.filter((e) => {
        const entryDate = new Date(e.timestamp)
        return !isNaN(entryDate.getTime()) && entryDate >= fromDate
      })
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      result = result.filter((e) => {
        const entryDate = new Date(e.timestamp)
        return !isNaN(entryDate.getTime()) && entryDate <= toDate
      })
    }

    // Text search across all plain-text fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.user.toLowerCase().includes(q) ||
          e.resource.toLowerCase().includes(q) ||
          e.result.toLowerCase().includes(q) ||
          (e.details ?? '').toLowerCase().includes(q)
      )
    }

    return result
  }, [entries, actionFilter, dateFrom, dateTo, searchQuery])

  // --- Format timestamp for display ---
  const formatTimestamp = (ts: string): string => formatDate(ts, true)

  // --- Loading ---
  if (loading) {
    return (
      <div
        className={cn('flex items-center justify-center p-8', className)}
        role="status"
        aria-label="Loading audit trail"
      >
        <div
          className="animate-spin motion-reduce:animate-none rounded-full h-6 w-6 border-b-2 border-[var(--dojo-primary)]"
          aria-hidden="true"
        />
        <span className="ml-3 text-sm text-muted-foreground">
          Loading audit trail...
        </span>
      </div>
    )
  }

  // --- Error ---
  if (error) {
    return (
      <ErrorState
        title="Error loading audit trail"
        message="We couldn't load the audit log."
        error={error}
        onRetry={fetchAuditLog}
        className={className}
      />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        {/* Action type filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="audit-action-filter"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1"
          >
            <Filter className="w-3 h-3" aria-hidden="true" />
            Action Type
          </label>
          <select
            id="audit-action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionType)}
            className={cn(
              'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--foreground)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
            )}
          >
            {ACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Actions' : type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="audit-date-from"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1"
          >
            <Clock className="w-3 h-3" aria-hidden="true" />
            From
          </label>
          <input
            id="audit-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={cn(
              'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--foreground)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
            )}
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="audit-date-to"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1"
          >
            <Clock className="w-3 h-3" aria-hidden="true" />
            To
          </label>
          <input
            id="audit-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={cn(
              'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--foreground)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
            )}
          />
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1 sm:flex-1 sm:min-w-[200px]">
          <label
            htmlFor="audit-search"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1"
          >
            <Search className="w-3 h-3" aria-hidden="true" />
            Search
          </label>
          <input
            id="audit-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit entries..."
            className={cn(
              'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--foreground)]',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
            )}
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchAuditLog}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
            'text-muted-foreground hover:text-[var(--foreground)]',
            'border border-[var(--border)] hover:bg-[var(--bg-quaternary)]',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
          )}
          aria-label="Refresh audit log"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
      </div>

      {/* Audit entries list */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-8">
          <EmptyState
            icon={FileText}
            title={entries.length === 0 ? 'No Audit Entries' : 'No Matches'}
            description={entries.length === 0
              ? 'No audit entries found.'
              : 'No entries match the current filters.'}
          />
        </div>
      ) : (
        <div
          className="overflow-y-auto max-h-[480px] rounded-lg border border-[var(--border)]"
          role="log"
          aria-label="Audit trail entries"
          aria-live="polite"
        >
          <table
            className="min-w-full text-sm"
            aria-label="Audit log"
          >
            <thead className="sticky top-0 z-10 bg-[var(--bg-quaternary)]">
              <tr className="border-b border-[var(--border)]">
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-44"
                >
                  Timestamp
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-36"
                >
                  Action
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-28"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase"
                >
                  Resource
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase w-24"
                >
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]">
                    {/* Plain text only - security requirement */}
                    <span className="font-medium">
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {/* Plain text only - security requirement */}
                    {entry.user}
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)] max-w-xs">
                    {/* Plain text only - security requirement: audit trails may contain finding data */}
                    <span className="font-mono text-xs break-all">
                      {entry.resource}
                    </span>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 break-all">
                        {entry.details}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ResultBadge result={entry.result} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
