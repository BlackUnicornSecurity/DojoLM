'use client'

/**
 * File: ScannerConfig.tsx
 * Purpose: Scanner engine configuration and Guard mode settings for Admin panel
 * Story: TPI-NODA-002-03
 * Index:
 * - ScannerConfig component (line 18)
 * - GuardConfigSection sub-component (line 75)
 */

import { cn } from '@/lib/utils'
import { useScanner } from '@/lib/ScannerContext'
import { useGuard } from '@/lib/contexts/GuardContext'
import { GUARD_MODES } from '@/lib/guard-constants'
import { FilterPills } from '@/components/ui/FilterPills'
import { Shield, Cpu, AlertTriangle, ShieldAlert } from 'lucide-react'

export function ScannerConfig() {
  const { engineFilters, toggleFilter, resetFilters } = useScanner()
  const activeCount = engineFilters.filter(f => f.enabled).length

  return (
    <div className="space-y-6">
      {/* Scanner Engine Configuration */}
      <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Cpu className="w-5 h-5" aria-hidden="true" />
              Scanner Engines
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeCount} of {engineFilters.length} engines active. Toggle engines on/off for scanning.
            </p>
          </div>
        </div>

        <FilterPills
          filters={engineFilters}
          onToggle={toggleFilter}
          onReset={resetFilters}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[var(--bg-tertiary)] p-3">
            <p className="text-xs text-muted-foreground">Total Engines</p>
            <p className="text-lg font-semibold text-foreground">{engineFilters.length}</p>
          </div>
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[var(--bg-tertiary)] p-3">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold text-green-400">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[var(--bg-tertiary)] p-3">
            <p className="text-xs text-muted-foreground">Disabled</p>
            <p className="text-lg font-semibold text-muted-foreground">{engineFilters.length - activeCount}</p>
          </div>
        </div>
      </div>

      {/* Guard Configuration */}
      <GuardConfigSection />
    </div>
  )
}

function GuardConfigSection() {
  const { config, setMode, setEnabled, setBlockThreshold, error } = useGuard()

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" aria-hidden="true" />
            Hattori Guard
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure LLM input/output protection mode.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={config.enabled}
          onClick={() => setEnabled(!config.enabled)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg motion-safe:transition-colors',
            config.enabled
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          )}
        >
          {config.enabled ? 'Disable Guard' : 'Enable Guard'}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-400">{error}</p>
      )}

      {/* Status */}
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full', config.enabled ? 'bg-green-500' : 'bg-gray-500')} aria-hidden="true" />
        <span className="text-sm text-foreground">
          {config.enabled ? 'Guard Active' : 'Guard Disabled'}
        </span>
        {config.enabled && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-quaternary)] text-muted-foreground">
            {GUARD_MODES.find(m => m.id === config.mode)?.name ?? config.mode}
          </span>
        )}
      </div>

      {/* Mode Selection */}
      <div className={cn(!config.enabled && 'opacity-50 pointer-events-none')}>
        <p className="text-xs font-medium text-muted-foreground mb-2">Guard Mode</p>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {GUARD_MODES.map(mode => {
            const ModeIcon = mode.icon
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setMode(mode.id)}
                disabled={!config.enabled}
                className={cn(
                  'rounded-lg border p-3 text-left motion-safe:transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  config.mode === mode.id
                    ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10'
                    : 'border-[rgba(255,255,255,0.06)] bg-[var(--bg-tertiary)] hover:border-[rgba(255,255,255,0.12)]'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ModeIcon className="w-4 h-4" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">{mode.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{mode.subtitle}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  {mode.inputScan && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Input</span>}
                  {mode.outputScan && <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Output</span>}
                  {mode.canBlock && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Block</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Block Threshold */}
      {config.enabled && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Block Threshold</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBlockThreshold('WARNING')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border motion-safe:transition-colors',
                config.blockThreshold === 'WARNING'
                  ? 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--warning)]'
                  : 'border-[rgba(255,255,255,0.06)] text-muted-foreground hover:text-foreground'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              WARNING+
            </button>
            <button
              type="button"
              onClick={() => setBlockThreshold('CRITICAL')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border motion-safe:transition-colors',
                config.blockThreshold === 'CRITICAL'
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-[rgba(255,255,255,0.06)] text-muted-foreground hover:text-foreground'
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              CRITICAL only
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
