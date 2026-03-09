/**
 * File: DataSourceSelector.tsx
 * Purpose: Filter pills for selecting active DNA data source tiers
 * Story: KASHIWA-12.2
 * Index:
 * - MasterSyncStatus interface (line 14)
 * - DataSourceSelectorProps interface (line 21)
 * - DataSourceSelector component (line 33)
 */

'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DATA_SOURCE_TIERS } from './data-source-tiers'
import type { DataSourceTier } from 'bu-tpi/attackdna'

export interface MasterSyncStatus {
  lastSyncAt: string | null
  syncInProgress: boolean
}

export interface DataSourceSelectorProps {
  activeTiers: Set<DataSourceTier>
  onToggle: (tier: DataSourceTier) => void
  onReset: () => void
  masterSyncStatus?: MasterSyncStatus | null
}

function formatSyncAge(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Never synced'
  const diffMs = Date.now() - new Date(lastSyncAt).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

function isSyncRecent(lastSyncAt: string | null): boolean {
  if (!lastSyncAt) return false
  const diffMs = Date.now() - new Date(lastSyncAt).getTime()
  return diffMs < 24 * 60 * 60_000 // Within 24 hours
}

export function DataSourceSelector({
  activeTiers,
  onToggle,
  onReset,
  masterSyncStatus,
}: DataSourceSelectorProps) {
  const handleToggle = useCallback(
    (tier: DataSourceTier) => {
      onToggle(tier)
    },
    [onToggle]
  )

  const allActive = DATA_SOURCE_TIERS.filter((t) => t.available).every((t) =>
    activeTiers.has(t.id)
  )

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="group"
      aria-label="Data source filter"
    >
      {DATA_SOURCE_TIERS.map((tier) => {
        const TierIcon = tier.icon
        const isActive = activeTiers.has(tier.id)
        const isDisabled = !tier.available

        return (
          <button
            key={tier.id}
            onClick={() => !isDisabled && handleToggle(tier.id)}
            disabled={isDisabled}
            aria-pressed={isActive}
            aria-label={`${tier.label}${isDisabled ? ' (Coming Soon)' : ''}`}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
              'border motion-safe:transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'min-h-[36px]',
              isDisabled && 'opacity-50 cursor-not-allowed',
              !isDisabled && !isActive && [
                'border-[var(--border)] text-muted-foreground',
                'hover:border-[var(--border-hover)] hover:text-[var(--foreground)]',
              ],
              !isDisabled && isActive && tier.id === 'master' && [
                'border-[var(--accent-gold)]/50 bg-[var(--accent-gold-muted)]',
                'text-[var(--accent-gold)]',
              ],
              !isDisabled && isActive && tier.id !== 'master' && [
                'border-[var(--bu-electric)]/50 bg-[var(--bu-electric-subtle)]',
                'text-[var(--bu-electric)]',
              ],
            )}
          >
            <TierIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{tier.label}</span>

            {/* Coming Soon badge for unavailable tiers */}
            {isDisabled && (
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 border-[var(--accent-gold)]/30 text-[var(--accent-gold)] ml-0.5"
              >
                Soon
              </Badge>
            )}

            {/* Master sync status indicator */}
            {tier.id === 'master' && masterSyncStatus && !isDisabled && (
              <span className="flex items-center gap-1 ml-0.5">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    masterSyncStatus.syncInProgress
                      ? 'bg-[var(--warning)] animate-pulse motion-reduce:animate-none'
                      : isSyncRecent(masterSyncStatus.lastSyncAt)
                        ? 'bg-[var(--success)]'
                        : 'bg-[var(--text-tertiary)]'
                  )}
                  aria-hidden="true"
                />
                <span className="text-[10px] text-muted-foreground">
                  {masterSyncStatus.syncInProgress
                    ? 'Syncing...'
                    : formatSyncAge(masterSyncStatus.lastSyncAt)}
                </span>
              </span>
            )}
          </button>
        )
      })}

      {/* Reset button — only shows when not all available tiers are active */}
      {!allActive && (
        <button
          onClick={onReset}
          className={cn(
            'text-xs text-muted-foreground hover:text-[var(--foreground)]',
            'underline motion-safe:transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'min-h-[36px] px-1',
          )}
          aria-label="Reset data source filter to show all"
        >
          All
        </button>
      )}
    </div>
  )
}
