'use client'

/**
 * File: KagamiPanel.tsx
 * Purpose: Kagami — Model Mirror main control panel
 * Story: K5.1
 * Index:
 * - PRESET_META config (line ~35)
 * - ALL_CATEGORIES list (line ~60)
 * - MODEL_OPTIONS (line ~80)
 * - KagamiPanel component (line ~95)
 */

import { useState, useCallback } from 'react'
import {
  Fingerprint, Search, ShieldCheck, Settings2, Play, Loader2,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { KagamiResults } from './KagamiResults'
import { ProbeProgress } from './ProbeProgress'
import type {
  KagamiResult,
  VerificationResult,
  ProbePresetName,
  ProbeCategory,
  KagamiMode,
} from 'bu-tpi/fingerprint'

// ---------------------------------------------------------------------------
// Preset metadata
// ---------------------------------------------------------------------------

interface PresetMeta {
  readonly name: ProbePresetName
  readonly label: string
  readonly probes: number
  readonly estTime: string
  readonly description: string
}

const PRESET_META: readonly PresetMeta[] = [
  { name: 'quick', label: 'Quick', probes: 40, estTime: '~30s', description: 'Fast identification' },
  { name: 'standard', label: 'Standard', probes: 76, estTime: '~1m', description: 'Balanced fingerprint' },
  { name: 'full', label: 'Full', probes: 210, estTime: '~3m', description: 'Complete fingerprint' },
  { name: 'verify', label: 'Verify', probes: 52, estTime: '~40s', description: 'Identity verification' },
  { name: 'stealth', label: 'Stealth', probes: 44, estTime: '~35s', description: 'Low-detection probes' },
] as const

// ---------------------------------------------------------------------------
// All probe categories for custom selection
// ---------------------------------------------------------------------------

const ALL_CATEGORIES: readonly { readonly id: ProbeCategory; readonly label: string }[] = [
  { id: 'self-disclosure', label: 'Self-Disclosure' },
  { id: 'capability', label: 'Capability' },
  { id: 'knowledge-boundary', label: 'Knowledge Boundary' },
  { id: 'safety-boundary', label: 'Safety Boundary' },
  { id: 'style-analysis', label: 'Style Analysis' },
  { id: 'parameter-sensitivity', label: 'Parameter Sensitivity' },
  { id: 'timing-latency', label: 'Timing/Latency' },
  { id: 'tokenizer', label: 'Tokenizer' },
  { id: 'multi-turn', label: 'Multi-Turn' },
  { id: 'censorship', label: 'Censorship' },
  { id: 'api-metadata', label: 'API Metadata' },
  { id: 'watermark', label: 'Watermark' },
  { id: 'multimodal', label: 'Multimodal' },
  { id: 'context-window', label: 'Context Window' },
  { id: 'fine-tuning', label: 'Fine-Tuning' },
  { id: 'quantization', label: 'Quantization' },
  { id: 'model-lineage', label: 'Model Lineage' },
] as const

// ---------------------------------------------------------------------------
// Target model options
// ---------------------------------------------------------------------------

const MODEL_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'target-api', label: 'Target API Endpoint' },
  { id: 'openai-gpt4', label: 'OpenAI GPT-4' },
  { id: 'openai-gpt4o', label: 'OpenAI GPT-4o' },
  { id: 'anthropic-claude3', label: 'Anthropic Claude 3' },
  { id: 'anthropic-claude35', label: 'Anthropic Claude 3.5' },
  { id: 'google-gemini', label: 'Google Gemini Pro' },
  { id: 'meta-llama3', label: 'Meta Llama 3' },
  { id: 'mistral-large', label: 'Mistral Large' },
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KagamiPanel() {
  // Mode
  const [mode, setMode] = useState<KagamiMode>('identify')

  // Config
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].id)
  const [selectedPreset, setSelectedPreset] = useState<ProbePresetName>('standard')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customCategories, setCustomCategories] = useState<ReadonlySet<ProbeCategory>>(new Set())

  // Execution state
  const [loading, setLoading] = useState(false)
  const [streamId, setStreamId] = useState<string | null>(null)
  const [result, setResult] = useState<KagamiResult | null>(null)
  const [verification, setVerification] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Toggle category for custom selection
  const toggleCategory = useCallback((cat: ProbeCategory) => {
    setCustomCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }, [])

  // Run fingerprint
  const handleRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setVerification(null)
    setStreamId(null)

    try {
      const body = {
        mode,
        modelId: selectedModel,
        preset: showAdvanced && customCategories.size > 0 ? undefined : selectedPreset,
        categories: showAdvanced && customCategories.size > 0
          ? Array.from(customCategories)
          : undefined,
      }

      const res = await fetchWithAuth('/api/llm/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `HTTP ${res.status}`)
      }

      const data = await res.json()

      // If response includes a streamId, show progress
      if (data.streamId) {
        setStreamId(data.streamId as string)
        return
      }

      // Direct result
      if (mode === 'verify' && data.verification) {
        setVerification(data.verification as VerificationResult)
      } else if (data.result) {
        setResult(data.result as KagamiResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fingerprint request failed')
    } finally {
      setLoading(false)
    }
  }, [mode, selectedModel, selectedPreset, showAdvanced, customCategories])

  // SSE completion handler — receives result directly from the stream event
  const handleStreamComplete = useCallback((streamResult?: unknown) => {
    try {
      const data = streamResult as Record<string, unknown> | undefined
      if (mode === 'verify' && data?.verification) {
        setVerification(data.verification as VerificationResult)
      } else if (data) {
        setResult(data as unknown as KagamiResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process results')
    } finally {
      setStreamId(null)
      setLoading(false)
    }
  }, [mode])

  const handleStreamError = useCallback((errMsg: string) => {
    setError(errMsg)
    setStreamId(null)
    setLoading(false)
  }, [])

  const activePreset = PRESET_META.find((p) => p.name === selectedPreset)

  return (
    <div className="space-y-6">
      {/* Header */}
      <ModuleHeader
        title="Kagami — Model Mirror"
        subtitle="Behavioral fingerprinting for LLM identification and verification"
        icon={Fingerprint}
      />

      {/* Configuration card */}
      <Card>
        <CardContent className="p-4 space-y-5">
          {/* Mode selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Mode</label>
            <div className="flex gap-2">
              <Button
                variant={mode === 'identify' ? 'gradient' : 'default'}
                size="sm"
                onClick={() => setMode('identify')}
                aria-pressed={mode === 'identify'}
              >
                <Search className="h-4 w-4 mr-1" aria-hidden="true" />
                Identify
              </Button>
              <Button
                variant={mode === 'verify' ? 'gradient' : 'default'}
                size="sm"
                onClick={() => setMode('verify')}
                aria-pressed={mode === 'verify'}
              >
                <ShieldCheck className="h-4 w-4 mr-1" aria-hidden="true" />
                Verify
              </Button>
            </div>
          </div>

          {/* Model selector */}
          <div className="space-y-2">
            <label htmlFor="kagami-model-select" className="text-sm font-medium text-[var(--foreground)]">
              Target Model
            </label>
            <select
              id="kagami-model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]',
                'px-3 py-2 text-sm text-[var(--foreground)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
              )}
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Preset selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Probe Preset</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {PRESET_META.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setSelectedPreset(preset.name)}
                  aria-pressed={selectedPreset === preset.name}
                  className={cn(
                    'rounded-lg border p-3 text-left motion-safe:transition-all motion-safe:duration-200',
                    selectedPreset === preset.name
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)]',
                  )}
                >
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {preset.label}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default">{preset.probes} probes</Badge>
                    <span className="text-xs text-muted-foreground">{preset.estTime}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced: category checkboxes */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm text-[var(--dojo-primary)] hover:underline"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              {showAdvanced ? 'Hide' : 'Show'} advanced category selection
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {ALL_CATEGORIES.map((cat) => (
                  <label
                    key={cat.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer motion-safe:transition-colors',
                      customCategories.has(cat.id)
                        ? 'border-[var(--dojo-primary)]/50 bg-[var(--dojo-primary)]/5'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-hover)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={customCategories.has(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="rounded border-[var(--border-subtle)] text-[var(--dojo-primary)] focus:ring-[var(--dojo-primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">{cat.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          <div className="flex items-center gap-3">
            <Button
              variant="gradient"
              onClick={handleRun}
              disabled={loading}
            >
              {loading
                ? <Loader2 className="h-4 w-4 mr-1 motion-safe:animate-spin" aria-hidden="true" />
                : <Play className="h-4 w-4 mr-1" aria-hidden="true" />}
              {loading ? 'Running...' : 'Run Fingerprint'}
            </Button>

            {activePreset && !showAdvanced && (
              <span className="text-xs text-muted-foreground">
                {activePreset.probes} probes, est. {activePreset.estTime}
              </span>
            )}
            {showAdvanced && customCategories.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {customCategories.size} categories selected (custom)
              </span>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3 text-sm text-[var(--danger)]" role="alert">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress (SSE streaming) */}
      {streamId && (
        <ProbeProgress
          streamId={streamId}
          onComplete={handleStreamComplete}
          onError={handleStreamError}
        />
      )}

      {/* Results */}
      <KagamiResults
        result={result ?? undefined}
        verification={verification ?? undefined}
      />
    </div>
  )
}
