/**
 * File: MutationTimeline.tsx
 * Purpose: Vertical timeline view of attack evolution with mutation type badges
 * Story: S76 - AttackDNA Explorer
 * Index:
 * - TimelineEntry interface (line 16)
 * - MOCK_TIMELINE data (line 25)
 * - mutationTypeConfig color map (line 145)
 * - severityBadgeColor map (line 185)
 * - getCategorySeverity helper (line 195)
 * - TimelineItem component (line 210)
 * - MutationTimeline component (line 285)
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Clock, GitCommit, Filter } from 'lucide-react'

interface TimelineEntry {
  id: string
  date: string
  mutationType: string
  nodeCategory: string
  description: string
  fromNodeId: string
  toNodeId: string
  similarity: number
}

// MOCK DATA — not wired to API. Replace with live data when backend integration is available.

const MOCK_TIMELINE: TimelineEntry[] = [
  {
    id: 'tl-001',
    date: '2026-02-28T09:15:00Z',
    mutationType: 'substitution',
    nodeCategory: 'prompt-injection',
    description: 'Synonym replacement of directive verbs: "ignore" replaced with "disregard", "reveal" replaced with "output".',
    fromNodeId: 'node-001',
    toNodeId: 'node-002',
    similarity: 0.87,
  },
  {
    id: 'tl-002',
    date: '2026-02-28T09:22:00Z',
    mutationType: 'encoding',
    nodeCategory: 'encoded',
    description: 'Base64 encoding applied to full payload. Original prompt injection content preserved in decoded form.',
    fromNodeId: 'node-001',
    toNodeId: 'node-003',
    similarity: 0.92,
  },
  {
    id: 'tl-003',
    date: '2026-02-28T10:05:00Z',
    mutationType: 'semantic',
    nodeCategory: 'social-engineering',
    description: 'Reframed as polite authority-based request. Added role-play framing to bypass detection heuristics.',
    fromNodeId: 'node-002',
    toNodeId: 'node-004',
    similarity: 0.71,
  },
  {
    id: 'tl-004',
    date: '2026-02-28T11:30:00Z',
    mutationType: 'structural',
    nodeCategory: 'jailbreak',
    description: 'Introduced dual-persona response format. Attack payload split across two simulated AI personalities.',
    fromNodeId: 'node-010',
    toNodeId: 'node-012',
    similarity: 0.76,
  },
  {
    id: 'tl-005',
    date: '2026-02-28T12:00:00Z',
    mutationType: 'insertion',
    nodeCategory: 'prompt-injection',
    description: 'Added fake system delimiter prefix "[SYSTEM]" to simulate trusted instruction source.',
    fromNodeId: 'node-012',
    toNodeId: 'node-013',
    similarity: 0.62,
  },
  {
    id: 'tl-006',
    date: '2026-02-28T14:15:00Z',
    mutationType: 'substitution',
    nodeCategory: 'jailbreak',
    description: 'Updated DAN version number from v1 to v2. Minor persona description changes to evade signature matching.',
    fromNodeId: 'node-010',
    toNodeId: 'node-011',
    similarity: 0.83,
  },
  {
    id: 'tl-007',
    date: '2026-02-28T15:40:00Z',
    mutationType: 'deletion',
    nodeCategory: 'prompt-injection',
    description: 'Removed explicit override language. Relies on implicit context manipulation through selective omission.',
    fromNodeId: 'node-002',
    toNodeId: 'node-005',
    similarity: 0.68,
  },
  {
    id: 'tl-008',
    date: '2026-02-28T16:20:00Z',
    mutationType: 'encoding',
    nodeCategory: 'encoded',
    description: 'Applied URL encoding to payload. Percent-encoded special characters to bypass text-based scanners.',
    fromNodeId: 'node-003',
    toNodeId: 'node-006',
    similarity: 0.91,
  },
  {
    id: 'tl-009',
    date: '2026-03-01T08:00:00Z',
    mutationType: 'semantic',
    nodeCategory: 'social-engineering',
    description: 'Reformulated attack as a technical support scenario. Leverages authority bias with researcher persona.',
    fromNodeId: 'node-004',
    toNodeId: 'node-007',
    similarity: 0.74,
  },
  {
    id: 'tl-010',
    date: '2026-03-01T09:30:00Z',
    mutationType: 'structural',
    nodeCategory: 'jailbreak',
    description: 'Wrapped payload in markdown code block with fake system prompt formatting to confuse context parsers.',
    fromNodeId: 'node-013',
    toNodeId: 'node-014',
    similarity: 0.58,
  },
]

// --- Mutation Type Config ---

const mutationTypeConfig: Record<string, { color: string; dotColor: string; bgColor: string }> = {
  substitution: {
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dotColor: 'bg-blue-500',
    bgColor: 'border-l-blue-500',
  },
  insertion: {
    color: 'bg-green-500/15 text-green-400 border-green-500/30',
    dotColor: 'bg-green-500',
    bgColor: 'border-l-green-500',
  },
  deletion: {
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
    dotColor: 'bg-red-500',
    bgColor: 'border-l-red-500',
  },
  encoding: {
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    dotColor: 'bg-yellow-500',
    bgColor: 'border-l-yellow-500',
  },
  structural: {
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    dotColor: 'bg-purple-500',
    bgColor: 'border-l-purple-500',
  },
  semantic: {
    color: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    dotColor: 'bg-orange-500',
    bgColor: 'border-l-orange-500',
  },
}

const defaultConfig = {
  color: 'bg-[var(--bg-quaternary)] text-muted-foreground border-[var(--border)]',
  dotColor: 'bg-gray-400',
  bgColor: 'border-l-gray-400',
}

const categoryBadgeColor: Record<string, string> = {
  'prompt-injection': 'bg-red-500/15 text-red-400 border-red-500/30',
  encoded: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'social-engineering': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  jailbreak: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  dos: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
}

const severityBadgeColor: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  info: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

// Derive severity from category for timeline entries
function getCategorySeverity(category: string): string {
  const mapping: Record<string, string> = {
    'prompt-injection': 'critical',
    jailbreak: 'critical',
    'social-engineering': 'high',
    encoded: 'high',
    dos: 'medium',
  }
  return mapping[category.toLowerCase()] ?? 'info'
}

// --- Sub-components ---

function TimelineItem({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  const config = mutationTypeConfig[entry.mutationType.toLowerCase()] ?? defaultConfig
  const catClass = categoryBadgeColor[entry.nodeCategory.toLowerCase()] ?? 'bg-[var(--bg-quaternary)] text-muted-foreground border-[var(--border)]'

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = new Date(entry.date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <li className="relative flex gap-4" aria-label={`${entry.mutationType} mutation on ${formattedDate}`}>
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            'w-3 h-3 rounded-full border-2 border-card z-10',
            config.dotColor
          )}
          aria-hidden="true"
        />
        {!isLast && (
          <div
            className="w-0.5 flex-1 bg-[var(--border)]"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-6 min-w-0', isLast && 'pb-0')}>
        <div
          className={cn(
            'rounded-lg border border-[var(--border)] border-l-4 p-3 bg-card',
            config.bgColor
          )}
        >
          {/* Date row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
            <time
              dateTime={entry.date}
              className="text-[11px] text-muted-foreground"
            >
              {formattedDate} at {formattedTime}
            </time>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn('text-xs px-1.5 py-0', config.color)}
            >
              {entry.mutationType}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-xs px-1.5 py-0', catClass)}
            >
              {entry.nodeCategory}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-xs px-1.5 py-0', severityBadgeColor[getCategorySeverity(entry.nodeCategory)])}
            >
              {getCategorySeverity(entry.nodeCategory)}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {(entry.similarity * 100).toFixed(0)}% sim
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-[var(--foreground)] leading-relaxed">
            {entry.description}
          </p>

          {/* Edge reference */}
          <div className="flex items-center gap-1.5 mt-2">
            <GitCommit className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-mono text-muted-foreground">
              {entry.fromNodeId} → {entry.toNodeId}
            </span>
          </div>
        </div>
      </div>
    </li>
  )
}

// --- Main Component ---

interface MutationTimelineProps {
  className?: string
  timelineEntries?: unknown[]
  activeTiers?: Set<string>
  searchQuery?: string
}

function convertAPITimeline(raw: unknown[]): TimelineEntry[] {
  if (!raw || raw.length === 0) return []
  return raw.map((item) => {
    const e = item as Record<string, unknown>
    return {
      id: String(e.nodeId ?? e.id ?? ''),
      date: String(e.date ?? ''),
      mutationType: String(e.event ?? 'mutation').replace('first-observed', 'insertion').replace('cluster-formed', 'structural'),
      nodeCategory: String(e.category ?? 'unknown'),
      description: `${String(e.event ?? 'event')} — ${String(e.category ?? '')} node ${String(e.nodeId ?? '')}`,
      fromNodeId: String(e.nodeId ?? ''),
      toNodeId: '',
      similarity: 0,
    }
  })
}

export function MutationTimeline({ className, timelineEntries: timelineProp, searchQuery = '' }: MutationTimelineProps) {
  const allTimeline = useMemo(() => timelineProp && timelineProp.length > 0
    ? convertAPITimeline(timelineProp)
    : MOCK_TIMELINE, [timelineProp])
  const resolvedTimeline = useMemo(() => {
    if (!searchQuery.trim()) return allTimeline
    const q = searchQuery.toLowerCase()
    return allTimeline.filter(e =>
      e.id.toLowerCase().includes(q) ||
      e.nodeCategory.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.mutationType.toLowerCase().includes(q)
    )
  }, [allTimeline, searchQuery])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleStartChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value), [])
  const handleEndChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value), [])
  const handleClearFilter = useCallback(() => { setStartDate(''); setEndDate('') }, [])

  // Filter entries by date range
  const filteredTimeline = useMemo(() => {
    return resolvedTimeline.filter((entry) => {
      const entryDate = entry.date.slice(0, 10) // YYYY-MM-DD
      if (startDate && entryDate < startDate) return false
      if (endDate && entryDate > endDate) return false
      return true
    })
  }, [startDate, endDate, resolvedTimeline])

  // Group timeline entries by date
  const dateGroups = useMemo(() => filteredTimeline.reduce<Record<string, TimelineEntry[]>>(
    (groups, entry) => {
      const dateKey = new Date(entry.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(entry)
      return groups
    },
    {}
  ), [filteredTimeline])

  const dateKeys = Object.keys(dateGroups)
  const isFiltered = startDate !== '' || endDate !== ''

  return (
    <div className={cn('space-y-6', className)}>
      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-[var(--dojo-primary)] shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium text-muted-foreground">Date Range</span>
            <div className="flex items-center gap-2">
              <label htmlFor="timeline-start" className="sr-only">Start date</label>
              <Input
                id="timeline-start"
                type="date"
                value={startDate}
                onChange={handleStartChange}
                className="h-8 w-36 text-xs"
                aria-label="Filter start date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <label htmlFor="timeline-end" className="sr-only">End date</label>
              <Input
                id="timeline-end"
                type="date"
                value={endDate}
                onChange={handleEndChange}
                className="h-8 w-36 text-xs"
                aria-label="Filter end date"
              />
            </div>
            {isFiltered && (
              <button
                onClick={handleClearFilter}
                className="text-xs text-muted-foreground hover:text-[var(--foreground)] underline motion-safe:transition-colors"
                aria-label="Clear date filter"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredTimeline.length} of {resolvedTimeline.length} entries
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
            Mutation Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Mutation type color legend">
            {Object.entries(mutationTypeConfig).map(([type, config]) => (
              <div key={type} className="flex items-center gap-1.5" role="listitem">
                <span
                  className={cn('w-2 h-2 rounded-full', config.dotColor)}
                  aria-hidden="true"
                />
                <span className="text-xs text-[var(--foreground)] capitalize">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {dateKeys.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {resolvedTimeline.length === 0
                ? 'No data — run a scan or trigger ingestion'
                : 'No timeline entries match the selected date range.'}
            </p>
          </CardContent>
        </Card>
      )}
      {dateKeys.map((dateKey) => {
        const entries = dateGroups[dateKey]
        return (
          <section key={dateKey} aria-label={`Mutations on ${dateKey}`}>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--dojo-primary)]"
                aria-hidden="true"
              />
              {dateKey}
            </h3>
            <ul className="space-y-0 ml-1" aria-label={`Timeline entries for ${dateKey}`}>
              {entries.map((entry, idx) => (
                <TimelineItem
                  key={entry.id}
                  entry={entry}
                  isLast={idx === entries.length - 1}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
