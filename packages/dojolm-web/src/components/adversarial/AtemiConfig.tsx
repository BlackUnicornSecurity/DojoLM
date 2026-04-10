/**
 * File: AtemiConfig.tsx
 * Purpose: Slide-in configuration panel for Atemi Lab
 * Story: TPI-NODA-6.1 - Atemi Lab Config Panel
 * Index:
 * - STORAGE_KEY constant (line 15)
 * - AtemiConfigData interface (line 17)
 * - DEFAULT_CONFIG (line 27)
 * - AtemiConfigProps interface (line 38)
 * - AtemiConfig component (line 47)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Settings,
  Save,
  RotateCcw,
  Server,
  Timer,
  Layers,
  ScrollText,
  Crosshair,
  Database,
} from 'lucide-react'
import {
  ORCHESTRATOR_STRATEGIES,
  ORCHESTRATOR_STRATEGY_INFO,
  RAG_ATTACK_VECTOR_OPTIONS,
  RAG_PIPELINE_STAGE_OPTIONS,
} from '@/lib/atemi-session-types'
import type {
  AtemiSessionConfig,
  OrchestratorStrategy,
  RagAttackVectorId,
  RagPipelineStageId,
} from '@/lib/atemi-session-types'

const STORAGE_KEY = 'atemi-config'
const VALID_ATTACK_MODES = ['passive', 'basic', 'advanced', 'aggressive'] as const

export type AtemiConfigData = AtemiSessionConfig

const DEFAULT_CONFIG: AtemiConfigData = {
  targetModel: '',
  attackMode: 'passive',
  orchestratorStrategy: '',
  ragAttackVector: '',
  ragPipelineStage: '',
  concurrency: 1,
  timeoutMs: 30000,
  autoLog: true,
}

export interface AtemiConfigProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (config: AtemiConfigData) => void
  className?: string
}

export function AtemiConfig({ isOpen, onClose, onSave, className }: AtemiConfigProps) {
  const [config, setConfig] = useState<AtemiConfigData>(DEFAULT_CONFIG)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Load config from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const obj = parsed as Record<string, unknown>
          const rawTarget = typeof obj.targetModel === 'string' ? obj.targetModel : DEFAULT_CONFIG.targetModel
          const rawMode = typeof obj.attackMode === 'string' ? obj.attackMode : DEFAULT_CONFIG.attackMode
          const rawConcurrency = typeof obj.concurrency === 'number' ? obj.concurrency : DEFAULT_CONFIG.concurrency
          const rawTimeout = typeof obj.timeoutMs === 'number' ? obj.timeoutMs : DEFAULT_CONFIG.timeoutMs
          const rawOrchestrator = typeof obj.orchestratorStrategy === 'string' ? obj.orchestratorStrategy : ''
          const rawRagVector = typeof obj.ragAttackVector === 'string' ? obj.ragAttackVector : ''
          const rawRagStage = typeof obj.ragPipelineStage === 'string' ? obj.ragPipelineStage : ''
          setConfig({
            targetModel: rawTarget.trim().slice(0, 256),
            attackMode: (VALID_ATTACK_MODES as readonly string[]).includes(rawMode) ? rawMode : DEFAULT_CONFIG.attackMode,
            orchestratorStrategy: (ORCHESTRATOR_STRATEGIES as readonly string[]).includes(rawOrchestrator) ? rawOrchestrator as OrchestratorStrategy : '',
            ragAttackVector: RAG_ATTACK_VECTOR_OPTIONS.some(v => v.id === rawRagVector) ? rawRagVector as RagAttackVectorId : '',
            ragPipelineStage: RAG_PIPELINE_STAGE_OPTIONS.some(s => s.id === rawRagStage) ? rawRagStage as RagPipelineStageId : '',
            concurrency: Math.min(10, Math.max(1, Math.round(rawConcurrency))),
            timeoutMs: Math.min(120000, Math.max(5000, rawTimeout)),
            autoLog: typeof obj.autoLog === 'boolean' ? obj.autoLog : DEFAULT_CONFIG.autoLog,
          })
        }
      }
    } catch {
      // Invalid stored data, use defaults
    }
  }, [])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => closeButtonRef.current?.focus())
    }
  }, [isOpen])

  // Escape key + focus trap for aria-modal compliance
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }

    if (e.key === 'Tab' && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, details > summary, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  // Lock body scroll while panel is open
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('overflow-hidden')
    return () => { document.body.classList.remove('overflow-hidden') }
  }, [isOpen])

  const handleSave = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    }
    onSave?.(config)
    onClose()
  }, [config, onSave, onClose])

  const handleReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG)
  }, [])

  const updateField = useCallback(<K extends keyof AtemiConfigData>(field: K, value: AtemiConfigData[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }, [])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Atemi Lab Configuration"
        aria-modal="true"
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md z-50',
          'bg-[var(--bg-secondary)] border-l border-[var(--border)]',
          'motion-safe:animate-slide-in-right',
          'flex flex-col',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[var(--dojo-primary)]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Atemi Lab Config</h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close config panel"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Target LLM */}
          <fieldset className="space-y-2">
            <legend className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Server className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Target LLM
            </legend>
            <input
              type="text"
              value={config.targetModel}
              onChange={(e) => updateField('targetModel', e.target.value)}
              maxLength={256}
              placeholder="e.g. gpt-4o, claude-3.5-sonnet"
              className="w-full px-3 py-2 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-tertiary)] min-h-[44px]"
              aria-label="Target model name"
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              Model identifier from your configured LLM providers
            </p>
          </fieldset>

          {/* Attack Mode */}
          <fieldset className="space-y-2">
            <legend className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Attack Mode
            </legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Attack mode">
              {(['passive', 'basic', 'advanced', 'aggressive'] as const).map((mode) => (
                <button
                  key={mode}
                  role="radio"
                  aria-checked={config.attackMode === mode}
                  onClick={() => updateField('attackMode', mode)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-sm font-medium capitalize min-h-[44px]',
                    'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                    config.attackMode === mode
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                      : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Orchestrator Strategy (PR-4f.1) */}
          <fieldset className="space-y-2">
            <legend className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Crosshair className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Orchestrator Strategy
            </legend>
            <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Orchestrator strategy">
              {/* None option */}
              <button
                role="radio"
                aria-checked={config.orchestratorStrategy === ''}
                onClick={() => updateField('orchestratorStrategy', '')}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg border text-left min-h-[44px]',
                  'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                  config.orchestratorStrategy === ''
                    ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10'
                    : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]'
                )}
              >
                <span className="text-base w-6 text-center" aria-hidden="true">-</span>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', config.orchestratorStrategy === '' ? 'text-[var(--dojo-primary)]' : 'text-[var(--foreground)]')}>None</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Manual single-turn attacks</p>
                </div>
              </button>
              {ORCHESTRATOR_STRATEGIES.map((strategy) => {
                const info = ORCHESTRATOR_STRATEGY_INFO[strategy]
                const isSelected = config.orchestratorStrategy === strategy
                return (
                  <button
                    key={strategy}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => updateField('orchestratorStrategy', strategy)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg border text-left min-h-[44px]',
                      'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                      isSelected
                        ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10'
                        : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]'
                    )}
                  >
                    <span className="text-base w-6 text-center" aria-hidden="true">{info.icon}</span>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium', isSelected ? 'text-[var(--dojo-primary)]' : 'text-[var(--foreground)]')}>{info.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{info.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* RAG Attack Target (PR-4f.2) */}
          <fieldset className="space-y-2">
            <legend className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              RAG Attack Target
            </legend>
            <div className="space-y-3">
              <div>
                <label htmlFor="atemi-rag-vector" className="text-xs text-[var(--text-tertiary)] block mb-1">
                  Attack Vector
                </label>
                <select
                  id="atemi-rag-vector"
                  value={config.ragAttackVector}
                  onChange={(e) => updateField('ragAttackVector', e.target.value as RagAttackVectorId | '')}
                  className={cn(
                    'w-full min-h-[44px] rounded-lg border bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    'border-[var(--border)]',
                  )}
                >
                  <option value="">None (no RAG targeting)</option>
                  {RAG_ATTACK_VECTOR_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="atemi-rag-stage" className="text-xs text-[var(--text-tertiary)] block mb-1">
                  Pipeline Stage
                </label>
                <select
                  id="atemi-rag-stage"
                  value={config.ragPipelineStage}
                  onChange={(e) => updateField('ragPipelineStage', e.target.value as RagPipelineStageId | '')}
                  className={cn(
                    'w-full min-h-[44px] rounded-lg border bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    'border-[var(--border)]',
                  )}
                >
                  <option value="">All stages</option>
                  {RAG_PIPELINE_STAGE_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Target specific RAG pipeline stages with 8 attack vectors from the SUIJUTSU module
              </p>
            </div>
          </fieldset>

          {/* Concurrency */}
          <fieldset className="space-y-2">
            <legend className="flex items-center justify-between text-sm font-semibold text-[var(--foreground)]">
              Concurrency
              <Badge variant="outline" className="text-xs">{config.concurrency}</Badge>
            </legend>
            <input
              type="range"
              min={1}
              max={10}
              value={config.concurrency}
              onChange={(e) => updateField('concurrency', Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Concurrent attack threads"
            />
            <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </fieldset>

          {/* Timeout */}
          <fieldset className="space-y-2">
            <legend className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Timer className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Timeout
              <Badge variant="outline" className="text-xs">{config.timeoutMs / 1000}s</Badge>
            </legend>
            <input
              type="range"
              min={5000}
              max={120000}
              step={5000}
              value={config.timeoutMs}
              onChange={(e) => updateField('timeoutMs', Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Request timeout in milliseconds"
            />
            <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>5s</span>
              <span>60s</span>
              <span>120s</span>
            </div>
          </fieldset>

          {/* Auto-log toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Auto-log attacks</p>
                <p className="text-xs text-[var(--text-tertiary)]">Automatically log all attack results</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={config.autoLog}
              onClick={() => updateField('autoLog', !config.autoLog)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                config.autoLog ? 'bg-[var(--success)]' : 'bg-[var(--bg-quaternary)]'
              )}
              aria-label="Toggle auto-logging"
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white',
                  'motion-safe:transition-transform motion-safe:duration-[var(--transition-fast)]',
                  config.autoLog ? 'translate-x-6' : 'translate-x-1'
                )}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-[var(--border)]">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-muted-foreground hover:bg-[var(--bg-quaternary)] min-h-[44px]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--dojo-primary)] text-white text-sm font-medium hover:bg-[var(--dojo-hover)] min-h-[44px] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Save Configuration
          </button>
        </div>
      </div>
    </>
  )
}
