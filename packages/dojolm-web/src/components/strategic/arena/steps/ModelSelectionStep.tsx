'use client'

import { useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Swords, Shield, AlertTriangle } from 'lucide-react'
import { useModelContext } from '@/lib/contexts/LLMModelContext'
import type { MatchFighter, FighterRole } from '@/lib/arena-types'
import type { WizardFormData } from '../MatchCreationWizard'

// ===========================================================================
// Types
// ===========================================================================

interface ModelSelectionStepProps {
  fighters: MatchFighter[]
  temperature: number
  maxTokens: number
  onUpdate: (updates: Partial<WizardFormData>) => void
}

const FIGHTER_SLOTS: { role: FighterRole; label: string; icon: typeof Swords; color: string }[] = [
  { role: 'attacker', label: 'Attacker', icon: Swords, color: 'var(--danger)' },
  { role: 'defender', label: 'Defender', icon: Shield, color: 'var(--success)' },
]

// ===========================================================================
// Component
// ===========================================================================

export function ModelSelectionStep({ fighters, temperature, maxTokens, onUpdate }: ModelSelectionStepProps) {
  const { models } = useModelContext()
  const enabledModels = useMemo(() => models.filter((m) => m.enabled), [models])

  // Sync fighter temperature/maxTokens when global values change
  useEffect(() => {
    if (fighters.length === 0) return
    const updated = fighters.map((f) => ({ ...f, temperature, maxTokens }))
    const changed = fighters.some((f, i) => f.temperature !== updated[i].temperature || f.maxTokens !== updated[i].maxTokens)
    if (changed) {
      onUpdate({ fighters: updated })
    }
  }, [temperature, maxTokens]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectModel = (role: FighterRole, modelId: string) => {
    const model = enabledModels.find((m) => m.id === modelId)
    if (!model) return

    const existing = fighters.filter((f) => f.initialRole !== role)
    const newFighter: MatchFighter = {
      modelId: model.id,
      modelName: model.name,
      provider: model.provider,
      initialRole: role,
      temperature,
      maxTokens,
    }
    onUpdate({ fighters: [...existing, newFighter] })
  }

  const isMirrorMatch = useMemo(() => {
    if (fighters.length < 2) return false
    const ids = fighters.map((f) => f.modelId)
    return ids[0] === ids[1]
  }, [fighters])

  const getFighterForRole = (role: FighterRole) =>
    fighters.find((f) => f.initialRole === role)

  return (
    <div className="space-y-6">
      {/* No models warning */}
      {enabledModels.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/20">
          <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-[var(--warning)]">No models configured</p>
            <p className="text-xs text-muted-foreground">
              Add and enable models in the LLM Dashboard before creating a match.
            </p>
          </div>
        </div>
      )}

      {/* Mirror match warning */}
      {isMirrorMatch && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bu-electric)]/10 border border-[var(--bu-electric)]/20">
          <AlertTriangle className="w-4 h-4 text-[var(--bu-electric)] shrink-0" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            Mirror match: same model on both sides. Results may vary due to temperature randomness.
          </p>
        </div>
      )}

      {/* Fighter slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIGHTER_SLOTS.map(({ role, label, icon: Icon, color }) => {
          const fighter = getFighterForRole(role)
          return (
            <Card key={role}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} aria-hidden="true" />
                  </div>
                  <span className="text-sm font-bold text-[var(--foreground)]">{label}</span>
                  {fighter && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {fighter.provider}
                    </Badge>
                  )}
                </div>

                {/* Model selector */}
                <select
                  value={fighter?.modelId ?? ''}
                  onChange={(e) => handleSelectModel(role, e.target.value)}
                  disabled={enabledModels.length === 0}
                  aria-label={`Select ${label} model`}
                  className={cn(
                    'w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-sm',
                    'shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
                    'text-[var(--foreground)]',
                    !fighter?.modelId && 'text-muted-foreground'
                  )}
                >
                  <option value="">Select a model...</option>
                  {enabledModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.provider})
                    </option>
                  ))}
                </select>

                {fighter && (
                  <p className="text-xs text-muted-foreground">
                    {fighter.modelName}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Global overrides */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Model Overrides
        </h3>
        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Temperature */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="temperature" className="text-sm font-medium text-[var(--foreground)]">
                  Temperature
                </label>
                <p className="text-xs text-muted-foreground">Higher = more creative attacks</p>
              </div>
              <input
                id="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => onUpdate({ temperature: Math.min(2, Math.max(0, Number(e.target.value) || 0)) })}
                className="w-20 h-11 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            {/* Max Tokens */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="max-tokens" className="text-sm font-medium text-[var(--foreground)]">
                  Max Tokens
                </label>
                <p className="text-xs text-muted-foreground">Maximum response length per round</p>
              </div>
              <input
                id="max-tokens"
                type="number"
                min={1}
                max={8192}
                value={maxTokens}
                onChange={(e) => onUpdate({ maxTokens: Math.min(8192, Math.max(1, Number(e.target.value) || 1)) })}
                className="w-24 h-11 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
