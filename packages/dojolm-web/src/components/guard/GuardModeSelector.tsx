'use client';

/**
 * File: GuardModeSelector.tsx
 * Purpose: Guard mode selection UI with toggle
 * Story: TPI-UIP-11
 */

import { useGuard } from '@/lib/contexts/GuardContext';
import { GUARD_MODES } from '@/lib/guard-constants';
import type { GuardMode } from '@/lib/guard-types';
import { Button } from '@/components/ui/button'
import { GlowCard } from '@/components/ui/GlowCard';
import { cn } from '@/lib/utils';
import { Power } from 'lucide-react';

export function GuardModeSelector() {
  const { config, setMode, setEnabled, setBlockThreshold } = useGuard();

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle + Threshold */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant={config.enabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEnabled(!config.enabled)}
            className={cn(
              config.enabled && 'bg-[var(--dojo-subtle)] text-[var(--dojo-primary-lg)] border border-[var(--dojo-primary)]/50 hover:bg-[var(--dojo-subtle)]'
            )}
            aria-pressed={config.enabled}
            aria-label={config.enabled ? 'Guard enabled, click to disable' : 'Guard disabled, click to enable'}
          >
            <Power className="w-4 h-4" aria-hidden="true" />
            {config.enabled ? 'Guard Active' : 'Guard Off'}
          </Button>
        </div>

        {/* Block Threshold Selector */}
        {config.enabled && (
          <div className="flex items-center gap-2">
            <span className="text-label text-muted-foreground">Block on:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setBlockThreshold('WARNING')}
                className={cn(
                  'px-2 py-1 text-xs rounded min-h-[44px] inline-flex items-center',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                  config.blockThreshold === 'WARNING'
                    ? 'bg-[var(--severity-medium-bg)] text-[var(--severity-medium)] border border-[var(--severity-medium)]/50'
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
                  'px-2 py-1 text-xs rounded min-h-[44px] inline-flex items-center',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                  config.blockThreshold === 'CRITICAL'
                    ? 'bg-[var(--status-block-bg)] text-[var(--status-block)] border border-[var(--status-block)]/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={config.blockThreshold === 'CRITICAL'}
                aria-label="Block on CRITICAL findings only"
              >
                CRITICAL only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="radiogroup" aria-label="Guard mode selection">
        {GUARD_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = config.mode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => setMode(mode.id as GuardMode)}
              disabled={!config.enabled}
              aria-disabled={!config.enabled}
              tabIndex={config.enabled ? 0 : -1}
              className={cn(
                'text-left p-0 rounded-lg border-0 bg-transparent',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
                !config.enabled && 'opacity-50 cursor-not-allowed'
              )}
              role="radio"
              aria-checked={isActive}
              aria-label={`Select ${mode.name} mode: ${mode.description}`}
            >
              <GlowCard
                glow={isActive ? 'accent' : 'subtle'}
                className={cn(
                  'p-4 h-full',
                  'transition-colors duration-[var(--transition-normal)]',
                  isActive
                    ? 'bg-[var(--dojo-primary)]/10 border-[var(--dojo-primary)]/50'
                    : 'hover:bg-[var(--bg-quaternary)]'
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className={cn('w-5 h-5 mt-0.5 flex-shrink-0', isActive && 'text-[var(--dojo-primary-lg)]')}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{mode.name}</span>
                    </div>
                    <p className="text-label text-muted-foreground mt-0.5">{mode.subtitle}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mode.description}</p>
                    {/* Scan indicators */}
                    <div className="flex gap-2 mt-2">
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        mode.inputScan ? 'bg-[var(--status-input-bg)] text-[var(--status-input)]' : 'bg-muted text-muted-foreground'
                      )}>
                        IN {mode.inputScan ? 'ON' : 'OFF'}
                      </span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        mode.outputScan ? 'bg-[var(--status-output-bg)] text-[var(--status-output)]' : 'bg-muted text-muted-foreground'
                      )}>
                        OUT {mode.outputScan ? 'ON' : 'OFF'}
                      </span>
                      {mode.canBlock && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--status-block-bg)] text-[var(--status-block)]">
                          BLOCK
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </GlowCard>
            </button>
          );
        })}
      </div>
    </div>
  );
}
