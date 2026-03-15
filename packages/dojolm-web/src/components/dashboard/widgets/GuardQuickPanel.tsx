'use client'

/**
 * File: GuardQuickPanel.tsx
 * Purpose: Guard mode display, toggle, threshold, and recent blocks for dashboard
 * Story: TPI-NODA-1.5.3
 */

import { useGuard } from '@/lib/contexts/GuardContext'
import { GUARD_MODES } from '@/lib/guard-constants'
import type { GuardMode } from '@/lib/guard-types'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { Power, RefreshCw } from 'lucide-react'
import { truncate } from '@/lib/utils'

export function GuardQuickPanel() {
  const { config, stats, recentEvents, setMode, setEnabled, setBlockThreshold, refreshEvents, isLoading } = useGuard()

  const modeInfo = GUARD_MODES.find(m => m.id === config.mode)
  const last3 = recentEvents.slice(0, 3)

  return (
    <WidgetCard
      title="Hattori Guard"
      actions={
        <button
          onClick={refreshEvents}
          className="p-1 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]"
          aria-label="Refresh guard events"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'motion-safe:animate-spin')} aria-hidden="true" />
        </button>
      }
    >
      <div className="space-y-3">
        {/* Mode display + toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {modeInfo && (
              <modeInfo.icon className="w-5 h-5 text-[var(--dojo-primary)]" aria-hidden="true" />
            )}
            <div>
              <div className="text-sm font-medium">{modeInfo?.name ?? config.mode}</div>
              <div className="flex items-center gap-1">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  config.enabled ? 'bg-[var(--status-online)]' : 'bg-[var(--status-offline)]'
                )} />
                <span className="text-xs text-muted-foreground">
                  {config.enabled ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEnabled(!config.enabled)}
            className={cn(
              'p-2 rounded-lg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
              config.enabled
                ? 'bg-[var(--dojo-subtle)] text-[var(--dojo-primary-lg)]'
                : 'bg-muted text-muted-foreground'
            )}
            aria-pressed={config.enabled}
            aria-label={config.enabled ? 'Disable guard' : 'Enable guard'}
          >
            <Power className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mode selector */}
        {config.enabled && (
          <div className="flex gap-1" role="radiogroup" aria-label="Guard mode">
            {GUARD_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setMode(mode.id as GuardMode)}
                className={cn(
                  'flex-1 px-1.5 py-1 text-xs font-medium rounded',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]',
                  config.mode === mode.id
                    ? 'bg-[var(--dojo-subtle)] text-[var(--dojo-primary)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                role="radio"
                aria-checked={config.mode === mode.id}
                aria-label={mode.name}
                title={mode.description}
              >
                {mode.name.slice(0, 3)}
              </button>
            ))}
          </div>
        )}

        {/* Block threshold */}
        {config.enabled && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Block threshold:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setBlockThreshold('WARNING')}
                className={cn(
                  'px-1.5 py-0.5 text-xs rounded',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]',
                  config.blockThreshold === 'WARNING'
                    ? 'bg-[var(--severity-medium-bg)] text-[var(--severity-medium)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={config.blockThreshold === 'WARNING'}
                aria-label="Block on WARNING and CRITICAL findings"
              >
                WARNING+
              </button>
              <button
                onClick={() => setBlockThreshold('CRITICAL')}
                className={cn(
                  'px-1.5 py-0.5 text-xs rounded',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]',
                  config.blockThreshold === 'CRITICAL'
                    ? 'bg-[var(--status-block-bg)] text-[var(--status-block)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={config.blockThreshold === 'CRITICAL'}
                aria-label="Block on CRITICAL findings only"
              >
                CRITICAL
              </button>
            </div>
          </div>
        )}

        {/* Last 3 block events */}
        {last3.length > 0 && (
          <div className="space-y-1 border-t border-[var(--border)] pt-2">
            <div className="text-xs text-muted-foreground font-medium">Recent Events</div>
            {last3.map(event => (
              <div key={event.id} className="flex items-center justify-between text-xs">
                <span className={cn(
                  'px-1 py-0.5 rounded font-medium',
                  event.action === 'block' ? 'bg-[var(--status-block-bg)] text-[var(--status-block)]' :
                  event.action === 'allow' ? 'bg-[var(--status-allow-bg)] text-[var(--status-allow)]' :
                  'bg-[var(--status-log-bg)] text-[var(--status-log)]'
                )}>
                  {event.action.toUpperCase()}
                </span>
                <span className="text-muted-foreground truncate ml-2 flex-1" title={event.scannedText}>
                  {truncate(event.scannedText, 30)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {last3.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground text-center py-2">No recent events</p>
        )}
      </div>
    </WidgetCard>
  )
}
