'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import type { GameMode, AttackMode, MatchConfig, MatchFighter } from '@/lib/arena-types'
import { GAME_MODE_CONFIGS, DEFAULT_MATCH_CONFIG } from '@/lib/arena-types'
import { BattleModeStep } from './steps/BattleModeStep'
import { ModelSelectionStep } from './steps/ModelSelectionStep'
import { AttackModeStep } from './steps/AttackModeStep'
import { LaunchStep } from './steps/LaunchStep'

// ===========================================================================
// Types
// ===========================================================================

type WizardStep = 0 | 1 | 2 | 3

const STEPS = [
  { label: 'Battle Mode', description: 'Choose game mode & rules' },
  { label: 'Fighters', description: 'Select models' },
  { label: 'Attack Mode', description: 'Choose attack strategy' },
  { label: 'Launch', description: 'Review & start' },
] as const

export interface WizardFormData {
  gameMode: GameMode | null
  attackMode: AttackMode | null
  maxRounds: number
  victoryPoints: number
  temperature: number
  maxTokens: number
  roleSwitchInterval: number
  fighters: MatchFighter[]
}

interface MatchCreationWizardProps {
  open: boolean
  onClose: () => void
  onSubmit: (config: MatchConfig, fighters: MatchFighter[], openLiveView: boolean) => void
}

// ===========================================================================
// Component
// ===========================================================================

export function MatchCreationWizard({ open, onClose, onSubmit }: MatchCreationWizardProps) {
  const [step, setStep] = useState<WizardStep>(0)
  const [formData, setFormData] = useState<WizardFormData>({
    gameMode: null,
    attackMode: null,
    maxRounds: DEFAULT_MATCH_CONFIG.maxRounds,
    victoryPoints: DEFAULT_MATCH_CONFIG.victoryPoints,
    temperature: 0.7,
    maxTokens: 2048,
    roleSwitchInterval: DEFAULT_MATCH_CONFIG.roleSwitchInterval,
    fighters: [],
  })

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0)
      setFormData({
        gameMode: null,
        attackMode: null,
        maxRounds: DEFAULT_MATCH_CONFIG.maxRounds,
        victoryPoints: DEFAULT_MATCH_CONFIG.victoryPoints,
        temperature: 0.7,
        maxTokens: 2048,
        roleSwitchInterval: DEFAULT_MATCH_CONFIG.roleSwitchInterval,
        fighters: [],
      })
    }
  }, [open])

  // Keyboard: Escape to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return formData.gameMode !== null
      case 1: return formData.fighters.length >= 2
      case 2: return formData.attackMode !== null
      case 3: return formData.gameMode !== null && formData.attackMode !== null && formData.fighters.length >= 2
      default: return false
    }
  }, [step, formData])

  const handleNext = useCallback(() => {
    if (step < 3 && canProceed()) {
      setStep((s) => (s + 1) as WizardStep)
    }
  }, [step, canProceed])

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => (s - 1) as WizardStep)
    }
  }, [step])

  const handleSubmit = useCallback((openLiveView: boolean) => {
    if (!formData.gameMode || !formData.attackMode) return

    const config: MatchConfig = {
      gameMode: formData.gameMode,
      attackMode: formData.attackMode,
      maxRounds: formData.maxRounds,
      victoryPoints: formData.victoryPoints,
      roundTimeoutMs: DEFAULT_MATCH_CONFIG.roundTimeoutMs,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      roleSwitchInterval: formData.roleSwitchInterval,
    }

    onSubmit(config, formData.fighters, openLiveView)
  }, [formData, onSubmit])

  const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Apply game mode defaults when selected
  const handleGameModeChange = useCallback((mode: GameMode) => {
    const modeConfig = GAME_MODE_CONFIGS[mode]
    updateFormData({
      gameMode: mode,
      maxRounds: modeConfig.defaultRounds,
      victoryPoints: modeConfig.defaultVictoryPoints,
    })
  }, [updateFormData])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 id="wizard-title" className="text-lg font-bold text-[var(--foreground)]">
              Forge New Battle
            </h2>
            <p className="text-sm text-muted-foreground">
              {STEPS[step].description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close wizard"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    'motion-safe:transition-colors motion-safe:duration-200',
                    i < step && 'bg-[var(--bu-electric)] text-white',
                    i === step && 'bg-[var(--accent-gold)] text-[var(--background)]',
                    i > step && 'bg-[var(--bg-tertiary)] text-muted-foreground'
                  )}
                >
                  {i < step ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={cn(
                  'text-xs font-medium hidden sm:block',
                  i === step ? 'text-[var(--foreground)]' : 'text-muted-foreground'
                )}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-px',
                    i < step ? 'bg-[var(--bu-electric)]' : 'bg-[var(--border-subtle)]'
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 0 && (
            <BattleModeStep
              selectedMode={formData.gameMode}
              onSelectMode={handleGameModeChange}
              maxRounds={formData.maxRounds}
              victoryPoints={formData.victoryPoints}
              roleSwitchInterval={formData.roleSwitchInterval}
              onUpdateConfig={updateFormData}
            />
          )}
          {step === 1 && (
            <ModelSelectionStep
              fighters={formData.fighters}
              temperature={formData.temperature}
              maxTokens={formData.maxTokens}
              onUpdate={updateFormData}
            />
          )}
          {step === 2 && (
            <AttackModeStep
              selectedMode={formData.attackMode}
              onSelectMode={(mode) => updateFormData({ attackMode: mode })}
            />
          )}
          {step === 3 && (
            <LaunchStep formData={formData} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)]">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Button>

          {step < 3 ? (
            <Button
              variant="gradient"
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  handleSubmit(false)
                  onClose()
                }}
                disabled={!canProceed()}
              >
                Fight in Shadow
              </Button>
              <Button
                variant="gradient"
                onClick={() => {
                  handleSubmit(true)
                  onClose()
                }}
                disabled={!canProceed()}
                className="gap-1"
              >
                Enter the Arena
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
