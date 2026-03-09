'use client'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Flag, Crown, Swords } from 'lucide-react'
import type { GameMode } from '@/lib/arena-types'
import { GAME_MODE_CONFIGS } from '@/lib/arena-types'
import type { WizardFormData } from '../MatchCreationWizard'

// ===========================================================================
// Constants
// ===========================================================================

const MODE_ICONS: Record<GameMode, typeof Flag> = {
  CTF: Flag,
  KOTH: Crown,
  RvB: Swords,
}

const MODE_COLORS: Record<GameMode, string> = {
  CTF: 'var(--danger)',
  KOTH: 'var(--accent-gold)',
  RvB: 'var(--bu-electric)',
}

interface BattleModeStepProps {
  selectedMode: GameMode | null
  onSelectMode: (mode: GameMode) => void
  maxRounds: number
  victoryPoints: number
  roleSwitchInterval: number
  onUpdateConfig: (updates: Partial<WizardFormData>) => void
}

// ===========================================================================
// Component
// ===========================================================================

export function BattleModeStep({
  selectedMode,
  onSelectMode,
  maxRounds,
  victoryPoints,
  roleSwitchInterval,
  onUpdateConfig,
}: BattleModeStepProps) {
  const modes = Object.values(GAME_MODE_CONFIGS)

  return (
    <div className="space-y-6">
      {/* Game mode radio cards */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Game Mode
        </h3>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          role="radiogroup"
          aria-label="Select game mode"
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
                    <p className="text-xs text-muted-foreground">{mode.id}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {mode.description}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-2 italic">
                  {mode.rules}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Configurable parameters */}
      {selectedMode && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Parameters
          </h3>
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Max Rounds */}
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="max-rounds" className="text-sm font-medium text-[var(--foreground)]">
                    Max Rounds
                  </label>
                  <p className="text-xs text-muted-foreground">Maximum number of attack rounds</p>
                </div>
                <input
                  id="max-rounds"
                  type="number"
                  min={1}
                  max={100}
                  value={maxRounds}
                  onChange={(e) => onUpdateConfig({ maxRounds: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })}
                  className="w-20 h-11 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              {/* Victory Points */}
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="victory-points" className="text-sm font-medium text-[var(--foreground)]">
                    Victory Points
                  </label>
                  <p className="text-xs text-muted-foreground">Points needed to win</p>
                </div>
                <input
                  id="victory-points"
                  type="number"
                  min={10}
                  max={1000}
                  value={victoryPoints}
                  onChange={(e) => onUpdateConfig({ victoryPoints: Math.min(1000, Math.max(10, Number(e.target.value) || 10)) })}
                  className="w-20 h-11 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              {/* Role Switch Interval (RvB only) */}
              {GAME_MODE_CONFIGS[selectedMode].supportsRoleSwap && (
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="role-switch" className="text-sm font-medium text-[var(--foreground)]">
                      Role Switch Interval
                    </label>
                    <p className="text-xs text-muted-foreground">Rounds between role swaps</p>
                  </div>
                  <input
                    id="role-switch"
                    type="number"
                    min={1}
                    max={20}
                    value={roleSwitchInterval}
                    onChange={(e) => onUpdateConfig({ roleSwitchInterval: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
                    className="w-20 h-11 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
