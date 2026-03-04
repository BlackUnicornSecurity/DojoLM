'use client';

/**
 * File: GuardAuditLog.tsx
 * Purpose: Guard audit event log with filtering and pagination
 * Story: TPI-UIP-11
 */

import { useState, useCallback, useEffect } from 'react';
import { useGuard } from '@/lib/contexts/GuardContext';
import type { GuardDirection, GuardAction, GuardAuditEntry } from '@/lib/guard-types';
import { GUARD_MODE_ICONS } from '@/lib/guard-constants';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Filter, ShieldAlert } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { EmptyState, emptyStatePresets } from '@/components/ui/EmptyState';

const PAGE_SIZE = 25;

export function GuardAuditLog() {
  const { recentEvents, refreshEvents } = useGuard();
  const [directionFilter, setDirectionFilter] = useState<GuardDirection | null>(null);
  const [actionFilter, setActionFilter] = useState<GuardAction | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const filtered = recentEvents.filter((event) => {
    if (directionFilter && event.direction !== directionFilter) return false;
    if (actionFilter && event.action !== actionFilter) return false;
    return true;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const actionColor = (action: GuardAction) => {
    switch (action) {
      case 'block': return 'text-[var(--status-block)] bg-[var(--status-block-bg)]';
      case 'allow': return 'text-[var(--status-allow)] bg-[var(--status-allow-bg)]';
      case 'log': return 'text-[var(--status-log)] bg-[var(--status-log-bg)]';
    }
  };

  const directionColor = (direction: GuardDirection) => {
    switch (direction) {
      case 'input': return 'text-[var(--status-input)] bg-[var(--status-input-bg)]';
      case 'output': return 'text-[var(--status-output)] bg-[var(--status-output-bg)]';
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" aria-hidden="true" />

        {/* Direction filters */}
        <div className="flex gap-1" role="group" aria-label="Filter by direction">
          {(['input', 'output'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => { setDirectionFilter((prev) => (prev === dir ? null : dir)); setPage(0); }}
              className={cn(
                'px-2 py-1 text-xs rounded capitalize',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
                directionFilter === dir
                  ? directionColor(dir)
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={directionFilter === dir}
            >
              {dir}
            </button>
          ))}
        </div>

        <span className="text-muted-foreground">|</span>

        {/* Action filters */}
        <div className="flex gap-1" role="group" aria-label="Filter by action">
          {(['allow', 'block', 'log'] as const).map((act) => (
            <button
              key={act}
              onClick={() => { setActionFilter((prev) => (prev === act ? null : act)); setPage(0); }}
              className={cn(
                'px-2 py-1 text-xs rounded capitalize',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
                actionFilter === act
                  ? actionColor(act)
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={actionFilter === act}
            >
              {act}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Events Table */}
      {paged.length === 0 ? (
        <EmptyState {...emptyStatePresets.noData} className="py-8" />
      ) : (
        <div className="space-y-1">
          {paged.map((event) => {
            const ModeIcon = GUARD_MODE_ICONS[event.mode] ?? ShieldAlert;
            const isExpanded = expandedId === event.id;

            return (
              <GlowCard
                key={event.id}
                glow={event.action === 'block' ? 'accent' : 'none'}
                className="p-0"
              >
                <button
                  onClick={() => toggleExpand(event.id)}
                  className={cn(
                    'w-full text-left p-3 flex items-center gap-3',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dojo-primary)]',
                    'rounded-lg'
                  )}
                  aria-expanded={isExpanded}
                  aria-label={`${event.action} event: ${event.direction} scan at ${new Date(event.timestamp).toLocaleString()}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground w-[140px] flex-shrink-0 font-mono">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>

                  {/* Mode */}
                  <span className="flex items-center gap-1 w-[80px] flex-shrink-0">
                    <ModeIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-xs capitalize">{event.mode}</span>
                  </span>

                  {/* Direction */}
                  <span className={cn(
                    'px-1.5 py-0.5 text-[10px] rounded capitalize w-[50px] text-center flex-shrink-0',
                    directionColor(event.direction)
                  )}>
                    {event.direction}
                  </span>

                  {/* Action */}
                  <span className={cn(
                    'px-1.5 py-0.5 text-[10px] rounded capitalize w-[50px] text-center flex-shrink-0 font-medium',
                    actionColor(event.action)
                  )}>
                    {event.action}
                  </span>

                  {/* Findings count */}
                  <span className="text-xs text-muted-foreground w-[60px] flex-shrink-0 text-center">
                    {event.scanResult?.findings ?? 0} finds
                  </span>

                  {/* Confidence */}
                  <span className="text-xs text-muted-foreground w-[50px] flex-shrink-0 text-right">
                    {Math.round(event.confidence * 100)}%
                  </span>

                  {/* Text preview */}
                  <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                    {event.scannedText.slice(0, 80)}{event.scannedText.length > 80 ? '...' : ''}
                  </span>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-[var(--border)] pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Event ID:</span>{' '}
                        <span className="font-mono">{event.id.slice(0, 12)}...</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Severity:</span>{' '}
                        <span className={cn(
                          event.scanResult?.severity === 'CRITICAL' && 'text-[var(--severity-critical)]',
                          event.scanResult?.severity === 'WARNING' && 'text-[var(--severity-medium)]',
                          event.scanResult?.severity === 'INFO' && 'text-[var(--status-log)]',
                        )}>
                          {event.scanResult?.severity ?? 'N/A'}
                        </span>
                      </div>
                      {event.modelConfigId && (
                        <div>
                          <span className="text-muted-foreground">Model:</span>{' '}
                          <span className="font-mono">{event.modelConfigId}</span>
                        </div>
                      )}
                      {event.testCaseId && (
                        <div>
                          <span className="text-muted-foreground">Test Case:</span>{' '}
                          <span className="font-mono">{event.testCaseId}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Scanned Text:</span>
                      <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-[200px] overflow-y-auto">
                        <code>{event.scannedText.slice(0, 500)}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </GlowCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]"
          >
            Prev
          </button>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Next page"
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
