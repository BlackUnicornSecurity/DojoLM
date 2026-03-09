'use client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Target, Zap, Scan, Flame } from 'lucide-react'
import type { AttackMode } from '@/lib/arena-types'
import { ATTACK_MODE_CONFIGS } from '@/lib/arena-types'

// ===========================================================================
// Constants
// ===========================================================================

const MODE_ICONS: Record<AttackMode, typeof Target> = {
  kunai: Target,
  shuriken: Zap,
  naginata: Scan,
  musashi: Flame,
}

const MODE_COLORS: Record<AttackMode, string> = {
  kunai: 'var(--dojo-primary)',
  shuriken: 'var(--accent-violet)',
  naginata: 'var(--bu-electric)',
  musashi: 'var(--accent-gold)',
}

const SOURCE_LABELS: Record<string, string> = {
  template: 'Templates',
  sage: 'SAGE',
  armory: 'Armory',
  atemi: 'Atemi',
}

interface AttackModeStepProps {
  selectedMode: AttackMode | null
  onSelectMode: (mode: AttackMode) => void
}

// ===========================================================================
// Component
// ===========================================================================

export function AttackModeStep({ selectedMode, onSelectMode }: AttackModeStepProps) {
  const modes = Object.values(ATTACK_MODE_CONFIGS)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Attack Strategy
      </h3>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        role="radiogroup"
        aria-label="Select attack mode"
      >
        {modes.map((mode) => {
          const Icon = MODE_ICONS[mode.id]
          const isSelected = selectedMode === mode.id
          const color = MODE_COLORS[mode.id]
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectMode(mode.id)}
              className={cn(
                'text-left p-4 rounded-xl border-2',
                'motion-safe:transition-all motion-safe:duration-200',
                'hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none',
                isSelected
                  ? 'border-current bg-[var(--card-elevated)]'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]'
              )}
              style={isSelected ? { borderColor: color } : undefined}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color }}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">{mode.name}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {mode.description}
              </p>

              {/* Source badges */}
              <div className="flex flex-wrap gap-1">
                {mode.sources.map((source) => (
                  <Badge key={source} variant="outline" className="text-xs">
                    {SOURCE_LABELS[source] ?? source}
                  </Badge>
                ))}
              </div>

              {/* Weight distribution for Musashi */}
              {mode.weights && (
                <div className="mt-2 space-y-1">
                  {Object.entries(mode.weights).map(([source, weight]) => (
                    <div key={source} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${weight}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16">
                        {SOURCE_LABELS[source]} {weight}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
