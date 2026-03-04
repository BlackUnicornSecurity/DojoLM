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
} from 'lucide-react'

const STORAGE_KEY = 'atemi-config'
const VALID_ATTACK_MODES = ['passive', 'basic', 'advanced', 'aggressive'] as const

export interface AtemiConfigData {
  targetModel: string
  attackMode: string
  concurrency: number
  timeoutMs: number
  autoLog: boolean
}

const DEFAULT_CONFIG: AtemiConfigData = {
  targetModel: '',
  attackMode: 'passive',
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
          setConfig({
            targetModel: rawTarget.trim().slice(0, 256),
            attackMode: (VALID_ATTACK_MODES as readonly string[]).includes(rawMode) ? rawMode : DEFAULT_CONFIG.attackMode,
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
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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
            className="p-2 rounded-md hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center"
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
              placeholder="e.g. gpt-4o, claude-3.5-sonnet"
              className="w-full px-3 py-2 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-tertiary)] min-h-[44px]"
              aria-label="Target model name"
            />
            <p className="text-[10px] text-[var(--text-tertiary)]">
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

          {/* Concurrency */}
          <fieldset className="space-y-2">
            <legend className="flex items-center justify-between text-sm font-semibold text-[var(--foreground)]">
              Concurrency
              <Badge variant="outline" className="text-[10px]">{config.concurrency}</Badge>
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
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
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
              <Badge variant="outline" className="text-[10px]">{config.timeoutMs / 1000}s</Badge>
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
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
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
                <p className="text-[10px] text-[var(--text-tertiary)]">Automatically log all attack results</p>
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
