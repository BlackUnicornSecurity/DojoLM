'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Swords, Shield, Flag, Crown, Target, Zap, Scan, Flame, Settings } from 'lucide-react'
import { GAME_MODE_CONFIGS, ATTACK_MODE_CONFIGS } from '@/lib/arena-types'
import type { WizardFormData } from '../MatchCreationWizard'

// ===========================================================================
// Constants
// ===========================================================================

const GAME_ICONS = { CTF: Flag, KOTH: Crown, RvB: Swords } as const
const ATTACK_ICONS = { kunai: Target, shuriken: Zap, naginata: Scan, musashi: Flame } as const

interface LaunchStepProps {
  formData: WizardFormData
}

// ===========================================================================
// Component
// ===========================================================================

export function LaunchStep({ formData }: LaunchStepProps) {
  const { gameMode, attackMode, fighters, maxRounds, victoryPoints, temperature, maxTokens, roleSwitchInterval } = formData

  const gameModeConfig = gameMode ? GAME_MODE_CONFIGS[gameMode] : null
  const attackModeConfig = attackMode ? ATTACK_MODE_CONFIGS[attackMode] : null
  const GameIcon = gameMode ? GAME_ICONS[gameMode] : Settings
  const AttackIcon = attackMode ? ATTACK_ICONS[attackMode] : Settings

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Battle Summary
      </h3>

      {/* Game Mode */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-gold)]/12 flex items-center justify-center">
              <GameIcon className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {gameModeConfig?.name ?? 'Not selected'}
              </p>
              <p className="text-xs text-muted-foreground">{gameMode}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-[var(--bg-tertiary)]">
              <p className="text-lg font-bold font-mono text-[var(--foreground)]">{maxRounds}</p>
              <p className="text-xs text-muted-foreground">Rounds</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-[var(--bg-tertiary)]">
              <p className="text-lg font-bold font-mono text-[var(--foreground)]">{victoryPoints}</p>
              <p className="text-xs text-muted-foreground">VP</p>
            </div>
            {gameModeConfig?.supportsRoleSwap && (
              <div className="text-center p-2 rounded-lg bg-[var(--bg-tertiary)]">
                <p className="text-lg font-bold font-mono text-[var(--foreground)]">{roleSwitchInterval}</p>
                <p className="text-xs text-muted-foreground">Swap</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fighters */}
      <Card>
        <CardContent className="pt-4">
          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Fighters</h4>
          <div className="space-y-2">
            {fighters.map((fighter) => {
              const isAttacker = fighter.initialRole === 'attacker'
              const RoleIcon = isAttacker ? Swords : Shield
              const roleColor = isAttacker ? 'var(--danger)' : 'var(--success)'
              return (
                <div
                  key={fighter.initialRole}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
                >
                  <RoleIcon className="w-4 h-4 shrink-0" style={{ color: roleColor }} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {fighter.modelName}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{fighter.initialRole}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {fighter.provider}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attack Mode */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--dojo-primary)]/12 flex items-center justify-center">
              <AttackIcon className="w-4 h-4 text-[var(--dojo-primary)]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {attackModeConfig?.name ?? 'Not selected'}
              </p>
              <p className="text-xs text-muted-foreground">{attackModeConfig?.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Overrides */}
      <Card>
        <CardContent className="pt-4">
          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Model Settings</h4>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Temperature: <span className="font-mono text-[var(--foreground)]">{temperature}</span></span>
            <span>Max Tokens: <span className="font-mono text-[var(--foreground)]">{maxTokens}</span></span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
