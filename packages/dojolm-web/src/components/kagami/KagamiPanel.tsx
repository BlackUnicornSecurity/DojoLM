'use client'

/**
 * File: KagamiPanel.tsx
 * Purpose: Kagami — Model Mirror main control panel
 * Story: K5.1
 * Index:
 * - PRESET_META config (line ~35)
 * - ALL_CATEGORIES list (line ~60)
 * - MODEL_OPTIONS (line ~80)
 * - KagamiPanel component (line ~120)
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Fingerprint, Search, ShieldCheck, Settings2, Play, Loader2, Radar, BookOpen,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { KagamiResults } from './KagamiResults'
import { ProbeProgress } from './ProbeProgress'
import { FeatureRadar, type RadarAxis } from './FeatureRadar'
import type {
  KagamiResult,
  VerificationResult,
  ProbePresetName,
  ProbeCategory,
  KagamiMode,
} from 'bu-tpi/fingerprint'

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

interface KagamiSignatureSummary {
  readonly modelId: string
  readonly modelFamily: string
  readonly provider: string
  readonly knowledgeCutoff?: string
  readonly lastVerified: string
  readonly featureCount: number
}

function formatFeatureLabel(featureId: string): string {
  return featureId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeYear(value?: string): number {
  const year = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(year)) return 0.55
  return Math.max(0.2, Math.min(1, (year - 2018) / 8))
}

function FingerprintWorkspace({
  mode,
  selectedModel,
  selectedPreset,
  showAdvanced,
  customCategories,
  loading,
  streamId,
  result,
  verification,
  error,
  activePreset,
  onSetMode,
  onSetSelectedModel,
  onSetSelectedPreset,
  onSetShowAdvanced,
  onToggleCategory,
  onRun,
  onStreamComplete,
  onStreamError,
}: {
  readonly mode: KagamiMode
  readonly selectedModel: string
  readonly selectedPreset: ProbePresetName
  readonly showAdvanced: boolean
  readonly customCategories: ReadonlySet<ProbeCategory>
  readonly loading: boolean
  readonly streamId: string | null
  readonly result: KagamiResult | null
  readonly verification: VerificationResult | null
  readonly error: string | null
  readonly activePreset?: PresetMeta
  readonly onSetMode: (mode: KagamiMode) => void
  readonly onSetSelectedModel: (modelId: string) => void
  readonly onSetSelectedPreset: (preset: ProbePresetName) => void
  readonly onSetShowAdvanced: (value: boolean) => void
  readonly onToggleCategory: (category: ProbeCategory) => void
  readonly onRun: () => void
  readonly onStreamComplete: (streamResult?: unknown) => void
  readonly onStreamError: (message: string) => void
}) {
  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Mode</label>
            <div className="flex gap-2">
              <Button
                variant={mode === 'identify' ? 'gradient' : 'default'}
                size="sm"
                onClick={() => onSetMode('identify')}
                aria-pressed={mode === 'identify'}
              >
                <Search className="h-4 w-4 mr-1" aria-hidden="true" />
                Identify
              </Button>
              <Button
                variant={mode === 'verify' ? 'gradient' : 'default'}
                size="sm"
                onClick={() => onSetMode('verify')}
                aria-pressed={mode === 'verify'}
              >
                <ShieldCheck className="h-4 w-4 mr-1" aria-hidden="true" />
                Verify
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="kagami-model-select" className="text-sm font-medium text-[var(--foreground)]">
              Target Model
            </label>
            <select
              id="kagami-model-select"
              value={selectedModel}
              onChange={(event) => onSetSelectedModel(event.target.value)}
              className={cn(
                'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]',
                'px-3 py-2 text-sm text-[var(--foreground)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
              )}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Probe Preset</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {PRESET_META.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onSetSelectedPreset(preset.name)}
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
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="default">{preset.probes} probes</Badge>
                    <span className="text-xs text-muted-foreground">{preset.estTime}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => onSetShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-[var(--dojo-primary)] hover:underline"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              {showAdvanced ? 'Hide' : 'Show'} advanced category selection
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {ALL_CATEGORIES.map((category) => (
                  <label
                    key={category.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 motion-safe:transition-colors',
                      customCategories.has(category.id)
                        ? 'border-[var(--dojo-primary)]/50 bg-[var(--dojo-primary)]/5'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-hover)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={customCategories.has(category.id)}
                      onChange={() => onToggleCategory(category.id)}
                      className="rounded border-[var(--border-subtle)] text-[var(--dojo-primary)] focus:ring-[var(--dojo-primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">{category.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="gradient" onClick={onRun} disabled={loading}>
              {loading
                ? <Loader2 className="mr-1 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                : <Play className="mr-1 h-4 w-4" aria-hidden="true" />}
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

          {error && (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3 text-sm text-[var(--danger)]" role="alert">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {streamId && (
        <ProbeProgress
          streamId={streamId}
          onComplete={onStreamComplete}
          onError={onStreamError}
        />
      )}

      <KagamiResults
        result={result ?? undefined}
        verification={verification ?? undefined}
      />
    </>
  )
}

function SignatureBrowser({
  signatures,
  signaturesLoading,
  signaturesError,
  signatureQuery,
  selectedProvider,
  selectedFamily,
  selectedSignature,
  providerOptions,
  familyOptions,
  onSetSignatureQuery,
  onSetSelectedProvider,
  onSetSelectedFamily,
  onSelectSignature,
}: {
  readonly signatures: readonly KagamiSignatureSummary[]
  readonly signaturesLoading: boolean
  readonly signaturesError: string | null
  readonly signatureQuery: string
  readonly selectedProvider: string
  readonly selectedFamily: string
  readonly selectedSignature: KagamiSignatureSummary | null
  readonly providerOptions: readonly string[]
  readonly familyOptions: readonly string[]
  readonly onSetSignatureQuery: (value: string) => void
  readonly onSetSelectedProvider: (value: string) => void
  readonly onSetSelectedFamily: (value: string) => void
  readonly onSelectSignature: (modelId: string) => void
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="kagami-signature-search" className="text-sm font-medium text-[var(--foreground)]">
              Search Signatures
            </label>
            <input
              id="kagami-signature-search"
              value={signatureQuery}
              onChange={(event) => onSetSignatureQuery(event.target.value)}
              placeholder="Search model, provider, family, cutoff..."
              className={cn(
                'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--foreground)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-[320px]">
            <label className="space-y-2 text-sm font-medium text-[var(--foreground)]">
              <span>Provider</span>
              <select
                value={selectedProvider}
                onChange={(event) => onSetSelectedProvider(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
              >
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider === 'all' ? 'All Providers' : provider}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--foreground)]">
              <span>Family</span>
              <select
                value={selectedFamily}
                onChange={(event) => onSetSelectedFamily(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
              >
                {familyOptions.map((family) => (
                  <option key={family} value={family}>
                    {family === 'all' ? 'All Families' : family}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {signaturesError && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3 text-sm text-[var(--danger)]" role="alert">
            {signaturesError}
          </div>
        )}

        {signaturesLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Loading Kagami signatures...
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="space-y-3">
              {signatures.map((signature) => (
                <button
                  key={signature.modelId}
                  type="button"
                  onClick={() => onSelectSignature(signature.modelId)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-colors',
                    selectedSignature?.modelId === signature.modelId
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)]',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{signature.modelId}</h3>
                    <Badge variant="default">{signature.provider}</Badge>
                    <Badge variant="outline">{signature.modelFamily}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="uppercase tracking-wide">Features</p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">{signature.featureCount}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Cutoff</p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">{signature.knowledgeCutoff ?? 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Verified</p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">{signature.lastVerified}</p>
                    </div>
                  </div>
                </button>
              ))}

              {signatures.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-sm text-muted-foreground">
                  No signatures match the current filters.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Signature Detail</h3>
              {selectedSignature ? (
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Model ID</p>
                    <p className="font-semibold text-[var(--foreground)]">{selectedSignature.modelId}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Provider</p>
                      <p>{selectedSignature.provider}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Family</p>
                      <p>{selectedSignature.modelFamily}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Feature Count</p>
                      <p>{selectedSignature.featureCount}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Knowledge Cutoff</p>
                      <p>{selectedSignature.knowledgeCutoff ?? 'Unknown'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Verified</p>
                    <p>{selectedSignature.lastVerified}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Select a signature record to inspect its metadata.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RadarWorkspace({
  result,
  selectedModel,
  selectedSignature,
}: {
  readonly result: KagamiResult | null
  readonly selectedModel: string
  readonly selectedSignature: KagamiSignatureSummary | null
}) {
  const [referenceTimestamp, setReferenceTimestamp] = useState<number | null>(null)

  useEffect(() => {
    setReferenceTimestamp(Date.now())
  }, [])

  const radarModel = useMemo(() => {
    if (result?.candidates?.[0]) {
      const topCandidate = result.candidates[0]
      const featureIds = [...new Set([...topCandidate.matchedFeatures, ...topCandidate.divergentFeatures])].slice(0, 8)

      if (featureIds.length > 0) {
        const axes: RadarAxis[] = featureIds.map((featureId) => ({
          key: featureId,
          label: formatFeatureLabel(featureId),
        }))

        return {
          title: 'Live Feature Agreement',
          description: 'Top-candidate agreement across the strongest matched and divergent fingerprint features from the latest run.',
          axes,
          targetValues: Object.fromEntries(featureIds.map((featureId) => [featureId, 1])),
          candidateValues: Object.fromEntries(featureIds.map((featureId) => [
            featureId,
            topCandidate.divergentFeatures.includes(featureId) ? 0.35 : 0.95,
          ])),
          targetLabel: selectedModel,
          candidateLabel: topCandidate.modelId,
        }
      }
    }

    if (!selectedSignature) return null

    const axes: RadarAxis[] = [
      { key: 'featureRichness', label: 'Feature Richness' },
      { key: 'verificationFreshness', label: 'Verification Freshness' },
      { key: 'knowledgeFreshness', label: 'Knowledge Freshness' },
      { key: 'familyStability', label: 'Family Stability' },
    ]

    const verifiedDaysAgo = Math.max(
      0,
      Math.round(((referenceTimestamp ?? new Date(selectedSignature.lastVerified).getTime()) - new Date(selectedSignature.lastVerified).getTime()) / 86_400_000),
    )

    return {
      title: 'Signature Profile Radar',
      description: 'Metadata-driven radar preview for the selected Kagami signature record.',
      axes,
      targetValues: {
        featureRichness: 1,
        verificationFreshness: 1,
        knowledgeFreshness: 1,
        familyStability: 1,
      },
      candidateValues: {
        featureRichness: Math.max(0.25, Math.min(1, selectedSignature.featureCount / 40)),
        verificationFreshness: Math.max(0.2, Math.min(1, 1 - verifiedDaysAgo / 365)),
        knowledgeFreshness: normalizeYear(selectedSignature.knowledgeCutoff),
        familyStability: selectedSignature.modelFamily.toLowerCase().includes('gpt') ? 0.92 : 0.76,
      },
      targetLabel: 'Reference Envelope',
      candidateLabel: selectedSignature.modelId,
    }
  }, [referenceTimestamp, result, selectedModel, selectedSignature])

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {radarModel ? (
          <>
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{radarModel.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{radarModel.description}</p>
            </div>
            <FeatureRadar
              axes={radarModel.axes}
              targetValues={radarModel.targetValues}
              candidateValues={radarModel.candidateValues}
              targetLabel={radarModel.targetLabel}
              candidateLabel={radarModel.candidateLabel}
              className="w-full"
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-sm text-muted-foreground">
            Run a fingerprint or load a signature record to populate the radar view.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function KagamiPanel() {
  const [activeView, setActiveView] = useState<'fingerprint' | 'signatures' | 'radar'>('fingerprint')
  const [mode, setMode] = useState<KagamiMode>('identify')
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].id)
  const [selectedPreset, setSelectedPreset] = useState<ProbePresetName>('standard')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customCategories, setCustomCategories] = useState<ReadonlySet<ProbeCategory>>(new Set())
  const [loading, setLoading] = useState(false)
  const [streamId, setStreamId] = useState<string | null>(null)
  const [result, setResult] = useState<KagamiResult | null>(null)
  const [verification, setVerification] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signatures, setSignatures] = useState<readonly KagamiSignatureSummary[]>([])
  const [signaturesLoading, setSignaturesLoading] = useState(false)
  const [signaturesError, setSignaturesError] = useState<string | null>(null)
  const [signatureQuery, setSignatureQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [selectedFamily, setSelectedFamily] = useState('all')
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null)

  const toggleCategory = useCallback((category: ProbeCategory) => {
    setCustomCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadSignatures = async () => {
      setSignaturesLoading(true)
      setSignaturesError(null)

      try {
        const response = await fetchWithAuth('/api/llm/fingerprint/signatures')
        if (!response.ok) {
          if (response.status === 401) throw new Error('Authentication required — sign in to view saved signatures')
          throw new Error(`Unable to load signatures (${response.status})`)
        }

        const data = await response.json() as { signatures?: KagamiSignatureSummary[] }
        if (!isMounted) return

        const nextSignatures = data.signatures ?? []
        setSignatures(nextSignatures)
        setSelectedSignatureId((current) => current ?? nextSignatures[0]?.modelId ?? null)
      } catch (err) {
        if (!isMounted) return
        setSignaturesError(err instanceof Error ? err.message : 'Unable to load signatures')
      } finally {
        if (isMounted) {
          setSignaturesLoading(false)
        }
      }
    }

    void loadSignatures()

    return () => {
      isMounted = false
    }
  }, [])

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
        categories: showAdvanced && customCategories.size > 0 ? Array.from(customCategories) : undefined,
      }

      const response = await fetchWithAuth('/api/llm/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        if (response.status === 401) throw new Error('Authentication required — sign in to run fingerprint analysis')
        const errText = await response.text()
        let message = `Request failed (${response.status})`
        try {
          const errJson = JSON.parse(errText)
          message = errJson.error || errJson.message || message
        } catch {
          if (errText) message = errText
        }
        throw new Error(message)
      }

      const data = await response.json()
      if (data.streamId) {
        setStreamId(data.streamId as string)
        return
      }

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
  }, [customCategories, mode, selectedModel, selectedPreset, showAdvanced])

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

  const handleStreamError = useCallback((message: string) => {
    setError(message)
    setStreamId(null)
    setLoading(false)
  }, [])

  const activePreset = PRESET_META.find((preset) => preset.name === selectedPreset)
  const providerOptions = useMemo(
    () => ['all', ...new Set(signatures.map((signature) => signature.provider))],
    [signatures],
  )
  const familyOptions = useMemo(
    () => ['all', ...new Set(signatures.map((signature) => signature.modelFamily))],
    [signatures],
  )
  const filteredSignatures = useMemo(() => {
    const query = signatureQuery.trim().toLowerCase()

    return signatures.filter((signature) => {
      if (selectedProvider !== 'all' && signature.provider !== selectedProvider) {
        return false
      }
      if (selectedFamily !== 'all' && signature.modelFamily !== selectedFamily) {
        return false
      }
      if (!query) return true

      return [
        signature.modelId,
        signature.modelFamily,
        signature.provider,
        signature.knowledgeCutoff ?? '',
      ].some((value) => value.toLowerCase().includes(query))
    })
  }, [selectedFamily, selectedProvider, signatureQuery, signatures])

  const selectedSignature = filteredSignatures.find((signature) => signature.modelId === selectedSignatureId)
    ?? filteredSignatures[0]
    ?? null

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Kagami — Model Mirror"
        subtitle="Behavioral fingerprinting for LLM identification and verification"
        icon={Fingerprint}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeView === 'fingerprint' ? 'gradient' : 'default'}
          size="sm"
          onClick={() => setActiveView('fingerprint')}
        >
          <Fingerprint className="mr-1 h-4 w-4" aria-hidden="true" />
          Fingerprint
        </Button>
        <Button
          variant={activeView === 'signatures' ? 'gradient' : 'default'}
          size="sm"
          onClick={() => setActiveView('signatures')}
        >
          <BookOpen className="mr-1 h-4 w-4" aria-hidden="true" />
          Signatures
        </Button>
        <Button
          variant={activeView === 'radar' ? 'gradient' : 'default'}
          size="sm"
          onClick={() => setActiveView('radar')}
        >
          <Radar className="mr-1 h-4 w-4" aria-hidden="true" />
          Feature Radar
        </Button>
      </div>

      {activeView === 'fingerprint' && (
        <FingerprintWorkspace
          mode={mode}
          selectedModel={selectedModel}
          selectedPreset={selectedPreset}
          showAdvanced={showAdvanced}
          customCategories={customCategories}
          loading={loading}
          streamId={streamId}
          result={result}
          verification={verification}
          error={error}
          activePreset={activePreset}
          onSetMode={setMode}
          onSetSelectedModel={setSelectedModel}
          onSetSelectedPreset={setSelectedPreset}
          onSetShowAdvanced={setShowAdvanced}
          onToggleCategory={toggleCategory}
          onRun={handleRun}
          onStreamComplete={handleStreamComplete}
          onStreamError={handleStreamError}
        />
      )}

      {activeView === 'signatures' && (
        <SignatureBrowser
          signatures={filteredSignatures}
          signaturesLoading={signaturesLoading}
          signaturesError={signaturesError}
          signatureQuery={signatureQuery}
          selectedProvider={selectedProvider}
          selectedFamily={selectedFamily}
          selectedSignature={selectedSignature}
          providerOptions={providerOptions}
          familyOptions={familyOptions}
          onSetSignatureQuery={setSignatureQuery}
          onSetSelectedProvider={setSelectedProvider}
          onSetSelectedFamily={setSelectedFamily}
          onSelectSignature={setSelectedSignatureId}
        />
      )}

      {activeView === 'radar' && (
        <RadarWorkspace
          result={result}
          selectedModel={selectedModel}
          selectedSignature={selectedSignature}
        />
      )}
    </div>
  )
}
