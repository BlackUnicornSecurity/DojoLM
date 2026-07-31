// SPDX-License-Identifier: Apache-2.0
/**
 * File: SenseiDrawer.tsx
 * Purpose: Floating Sensei AI assistant drawer — A.5 thin shim around
 *          `<Drawer variant="default">`.
 * Story: SH6.2, SH6.4 (+ UI Coherence Phase 1 W2 A.5 consolidation)
 * Index:
 *   - SenseiDrawer component (line 60)
 *   - SenseiModelPicker component (kept verbatim below the shim)
 *
 * --- A.5 consolidation notes ---
 *
 * Previously this file shipped a self-contained `<div role="dialog">`
 * drawer panel with Tailwind-class slide chrome + custom click-outside
 * / Escape handlers. For the A.5 Drawer / Sheet anchor primitive (UI
 * Coherence Phase 1 W2) the drawer chrome (open/close lifecycle,
 * backdrop, focus trap, Escape, native <dialog> top-layer semantics)
 * has moved to `src/design/primitives/Drawer.tsx`. The drawer panel
 * now composes `<Drawer variant="default">`; the floating Sensei bot
 * toggle button stays AS-IS so the E-B8 floating-bot dedup epic
 * (Phase 2) is a separate change with isolated review.
 *
 * Backward-compat guarantees (zero consumer regression):
 *   - Prop signature `{ activeModule, onNavigate }` preserved verbatim
 *     — the same shell-chrome mount point (`shell-chrome.tsx`) keeps
 *     working unchanged.
 *   - Floating bot `<button data-sensei-toggle>` is rendered with the
 *     same className stack + aria-label + aria-expanded contract
 *     (SD-001 asserts).
 *   - Drawer panel preserves:
 *       aria-label="Sensei AI Assistant"  (SD-002)
 *       aria-modal="true"                  (SD-002)
 *       data-sensei-drawer-title on title  (E8-S7-004)
 *       visible "Sensei" text              (SD-003)
 *       "Clear chat history" + "Close Sensei" buttons (SD-004 + SD-005)
 *       role="alert" on the error banner   (SD-006)
 *       SenseiChat child component         (SD-007)
 *       SenseiCapabilityPanel between picker and chat (SD-008)
 *   - The existing `useSensei` controller still owns `isOpen` +
 *     close / toggle / clearHistory state; the shim is purely a
 *     view-layer adapter that delegates panel chrome to `<Drawer>`.
 *
 * What changes (intentional, behind-the-scenes):
 *   - The panel renders as a native `<dialog>` (top-layer modal) via
 *     `<Drawer>` instead of a `translate-x-full`-toggled div. UA owns
 *     the focus trap + Esc-to-close on real browsers.
 *   - Click-outside-to-close is now backdrop-click-to-close (native
 *     `<dialog>::backdrop`). The pre-A.5 `[data-sensei-toggle]`-
 *     exclusion guard is unnecessary because the floating bot is
 *     hidden (`scale-0 pointer-events-none`) while `isOpen`, so it
 *     cannot intercept a backdrop click.
 *   - The pre-A.5 click-outside + Escape `useEffect` listeners are
 *     deleted — both behaviors are owned by the canonical primitive
 *     now (backdrop click + native cancel event).
 *
 * E-B8 Sensei dedup (Phase 2) is a SEPARATE epic — the floating bot
 * stays mounted from this file. Do NOT remove it here.
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { Bot, X, Trash2, ChevronDown, Plug } from 'lucide-react'
import { useSensei } from '@/hooks/useSensei'
import { SenseiChat } from './SenseiChat'
import { SenseiCapabilityPanel } from './SenseiCapabilityPanel'
import { canAccessProtectedApi } from '@/lib/client-auth-access'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { Drawer } from '@/design/primitives/Drawer'
import type { NavId } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SenseiDrawerProps {
  readonly activeModule: NavId
  readonly onNavigate?: (module: NavId) => void
}

interface ModelInfo {
  readonly id: string
  readonly name: string
  readonly provider: string
  /**
   * Wave 3ff (F-7-005 P1 retire) — raw model identifier (e.g.
   * "qwen3.5:122b"). Carried alongside the display `name` so the
   * client-side 40B cap filter can parse the size token from either
   * field. Kept optional so legacy callers / API responses without
   * a `model` field still parse via `name`.
   */
  readonly model?: string
}

// ---------------------------------------------------------------------------
// Wave 3ff (F-7-005 P1 retire) — Client-side defense-in-depth for the
// 40B parameter cap. The server-side filter at `/api/llm/models` already
// excludes banned models (`isWithinSizeCap`), but that filter is bypassed
// in demo mode (`demoModelsGet` returns the raw DEMO_MODELS array) and
// any future code path that hands an unfiltered list to the picker would
// re-expose banned models. We re-parse the size client-side so the
// picker never lists a >40B model regardless of upstream filtering.
// ---------------------------------------------------------------------------

const MAX_PARAMETER_SIZE_B = 40

/**
 * Parse an approximate parameter count in billions from a model identifier
 * or display name. Mirrors the server-side `parseSize` at
 * `src/app/api/llm/models/route.ts:92`. Returns `undefined` when no size
 * token is present (hosted-frontier models like "gpt-4o") so the picker
 * fails-open on what it cannot identify.
 */
function parseModelSize(value: string | undefined): number | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  const lower = value.toLowerCase()

  // MoE / sharded form first: e.g. 8x7b → 56B
  const moe = lower.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b/)
  if (moe) {
    const experts = Number(moe[1])
    const perExpert = Number(moe[2])
    if (Number.isFinite(experts) && Number.isFinite(perExpert)) {
      return experts * perExpert
    }
  }

  // Plain "<num>b" suffix — pick the LARGEST match so "Llama 3.1 70B"
  // resolves to 70 not 3.1.
  let largest: number | undefined
  const billionsRe = /(?:^|[:_\-/\s])(\d+(?:\.\d+)?)\s*b\b/g
  for (const m of lower.matchAll(billionsRe)) {
    const n = Number(m[1])
    if (Number.isFinite(n) && (largest === undefined || n > largest)) {
      largest = n
    }
  }
  if (largest !== undefined) return largest

  const millionsRe = /(?:^|[:_\-/\s])(\d+(?:\.\d+)?)\s*m\b/g
  for (const m of lower.matchAll(millionsRe)) {
    const n = Number(m[1])
    if (Number.isFinite(n)) {
      const inB = n / 1000
      if (largest === undefined || inB > largest) largest = inB
    }
  }

  return largest
}

/**
 * Wave 3ff (F-7-005 P1 retire) — Returns true if a model is selectable
 * under the operating cap. Models with no parseable size pass through
 * (fail-open: hosted-frontier IDs like "gpt-4o" / "claude-3-5-sonnet"
 * have no explicit size suffix and must not be silently dropped).
 */
export function isModelWithinSizeCap(model: ModelInfo): boolean {
  const fromModel = parseModelSize(model.model)
  const fromName = parseModelSize(model.name)
  const candidates = [fromModel, fromName].filter(
    (v): v is number => typeof v === 'number'
  )
  if (candidates.length === 0) return true
  return Math.max(...candidates) <= MAX_PARAMETER_SIZE_B
}

// ---------------------------------------------------------------------------
// Main Drawer Component
// ---------------------------------------------------------------------------

export function SenseiDrawer({ activeModule, onNavigate }: SenseiDrawerProps) {
  const {
    messages,
    isOpen,
    isLoading,
    selectedModelId,
    pendingConfirmations,
    error,
    wasStopped,
    sendMessage,
    confirmToolCall,
    rejectToolCall,
    regenerate,
    stopStreaming,
    setSelectedModelId,
    toggle,
    close,
    clearHistory,
    clearError,
  } = useSensei(activeModule, onNavigate)

  // E4.S9 round-2 (V5 W3y QA): ref the model picker container so the
  // SenseiChat "Pick a model" CTA can lift focus when invoked. Without
  // this, the CTA renders but is a no-op (parent provides no callback).
  const modelPickerRef = useRef<HTMLDivElement>(null)
  const handlePickModel = useCallback(() => {
    const node = modelPickerRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const button = node.querySelector('button')
    if (button instanceof HTMLButtonElement) button.focus()
  }, [])

  /**
   * VIS-09: "Configure Providers" CTA. Closes the drawer and navigates to Admin.
   */
  const handleConfigureProviders = useCallback(() => {
    close()
    onNavigate?.('admin')
  }, [close, onNavigate])

  return (
    <>
      {/* Floating toggle button — E7.S7 (F-4-022): canonical
          design-system focus ring sourced from `--torii-hi` via the
          `.sensei-toggle` class declared in primitives.css. The
          Tailwind `focus-visible:ring-*` utilities remain as a layout
          fallback for the legacy `--ring` chain; the class-based rule
          wins for the design-system canvas. */}
      <button
        data-sensei-toggle
        onClick={toggle}
        className={cn(
          'sensei-toggle',
          'fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center justify-center',
          'w-12 h-12 rounded-full shadow-lg',
          'bg-[var(--primary)] text-white',
          'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
          'motion-safe:transition-transform motion-safe:hover:scale-105',
          isOpen && 'scale-0 pointer-events-none',
        )}
        aria-label={isOpen ? 'Close Sensei' : 'Open Sensei'}
        aria-expanded={isOpen}
        aria-hidden={isOpen ? true : undefined}
        tabIndex={isOpen ? -1 : 0}
      >
        <Bot className="w-6 h-6" aria-hidden="true" />
      </button>

      {/* Drawer panel — A.5 canonical primitive. ariaLabel preserves
          SD-002 + E8-S7-004; titleAs="div" preserves the post-E8-S7
          heading-bleedthrough fix (the visible "Sensei" label must
          NOT be an h2 because the drawer mounts on every authenticated
          page and an h2 contaminated SR heading-nav). data-sensei-drawer-title
          stays attached to the inner span so existing selectors keep
          resolving. */}
      <Drawer
        open={isOpen}
        onClose={close}
        renderWhenClosed
        ariaLabel="Sensei AI Assistant"
        title={
          <span className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            <span data-sensei-drawer-title>Sensei</span>
          </span>
        }
        titleAs="div"
        variant="default"
        className="dojo-sensei-drawer"
        closeLabel="Close Sensei"
        closeText={<X className="w-4 h-4" aria-hidden="true" />}
        bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        headerActions={
          <button
            onClick={clearHistory}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--foreground)] hover:bg-[var(--bg-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
            aria-label="Clear chat history"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        }
      >
        {/* Body layout — flex column filling the body slot. SenseiChat
            owns its own internal scroll. The body's default padding is
            zeroed via `bodyStyle` so the model picker + capability
            panel keep their edge-to-edge background fills. */}
        <div className="flex flex-col h-full">
          {/* Model picker */}
          <div
            ref={modelPickerRef}
            className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
          >
            <SenseiModelPicker
              selectedModelId={selectedModelId}
              onSelect={setSelectedModelId}
              onConfigureProviders={handleConfigureProviders}
            />
          </div>

          {/* Capability summary — role/tier-filtered tool set + native/XML
              mode badge, fetched only while the drawer is open. */}
          <SenseiCapabilityPanel active={isOpen} />

          {/* F-R3-02: Error banner for missing model or other errors */}
          {error && (
            <div
              className="flex items-center justify-between px-4 py-2 text-xs bg-[var(--bg-warning)] text-[var(--text-warning)] border-b border-[var(--border-warning)]"
              role="alert"
            >
              <span>{error}</span>
              <button
                onClick={clearError}
                className="ml-2 p-0.5 rounded hover:bg-[var(--bg-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                aria-label="Dismiss error"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Chat body */}
          <SenseiChat
            messages={messages}
            isLoading={isLoading}
            activeModule={activeModule}
            pendingConfirmations={pendingConfirmations}
            onSend={sendMessage}
            onConfirm={confirmToolCall}
            onReject={rejectToolCall}
            onNavigate={onNavigate}
            onStop={stopStreaming}
            wasStopped={wasStopped}
            onRegenerate={regenerate}
            /*
              E4.S9 — F-7-019 (P1) retire. Surface "no model picked" in the
              empty branch BEFORE the user types so they don't get silently
              dropped on first send. The picker affordance lives upstream;
              we just toggle the missing-model state and let the chat
              render the CTA inline.
            */
            isModelMissing={selectedModelId === null}
            onPickModel={handlePickModel}
          />
        </div>
      </Drawer>
    </>
  )
}

// ---------------------------------------------------------------------------
// Model Picker (SH6.4) — preserved verbatim from pre-A.5 module.
// ---------------------------------------------------------------------------

interface SenseiModelPickerProps {
  readonly selectedModelId: string | null
  readonly onSelect: (modelId: string) => void
  /**
   * VIS-09: called when the user clicks the "Configure Providers" CTA shown
   * in the empty state. Host (SenseiDrawer) handles navigation + drawer close.
   */
  readonly onConfigureProviders?: () => void
}

function SenseiModelPicker({ selectedModelId, onSelect, onConfigureProviders }: SenseiModelPickerProps) {
  const [models, setModels] = useState<readonly ModelInfo[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  // Sensei Rework (Pillar B, step 9) — the pinned Sensei-brain id
  // (`sensei_model.config_id`). Used to (a) seed the picker with the
  // configured brain when nothing is selected yet — `selectedModelId ===
  // null` falls back to the brain, never a hard error — and (b) mark which
  // row IS the brain so the operator can tell the large brain apart from
  // the ≤40B targets it sits alongside.
  const [brainId, setBrainId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch the Sensei-brain candidate models on mount.
  useEffect(() => {
    let cancelled = false
    async function loadModels() {
      setIsLoadingModels(true)

      try {
        if (!(await canAccessProtectedApi())) {
          return
        }

        // Sensei Rework (Pillar B, step 9) — this is the dedicated
        // Sensei-brain picker, NOT a target list. `senseiOnly=true` LIFTS
        // the ≤40B target cap (the brain may be a large model) and
        // `includeBrain=true` keeps the pinned brain visible. The brain
        // pointer itself is read from the admin-settings snapshot so the
        // picker can seed + label it.
        const [res, settingsRes] = await Promise.all([
          fetchWithAuth('/api/llm/models?senseiOnly=true&includeBrain=true'),
          fetchWithAuth('/api/admin/settings').catch(() => null),
        ])
        if (!res.ok || cancelled) return

        const data: unknown = await res.json()
        if (cancelled) return

        // The brain pointer is best-effort: a failed settings read just
        // means no row is marked/seeded as the brain (the picker still
        // works, falling back to the first model).
        let pinnedBrainId: string | null = null
        if (settingsRes && settingsRes.ok) {
          try {
            const snapshot: unknown = await settingsRes.json()
            const raw = (snapshot as Record<string, unknown> | null)?.sensei_model_config_id
            if (typeof raw === 'string' && raw.length > 0) pinnedBrainId = raw
          } catch {
            // Malformed settings body — leave the brain unmarked.
          }
        }

        const modelArr = Array.isArray(data) ? data : (data as Record<string, unknown>)?.models
        if (!Array.isArray(modelArr)) return

        const parsed: ModelInfo[] = (modelArr
          .filter((m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null) as Record<string, unknown>[])
          .map((m: Record<string, unknown>) => ({
            id: String(m.id ?? m.name ?? ''),
            name: String(m.name ?? m.id ?? 'Unknown'),
            provider: String(m.provider ?? 'unknown'),
            ...(typeof m.model === 'string' ? { model: m.model } : {}),
          }))
        // NOTE: the ≤40B `isModelWithinSizeCap` filter is deliberately NOT
        // applied here — the cap is a target-selection policy, and the
        // Sensei brain is exempt from it (the helper stays exported for
        // the target-list callers + the f7 size-cap sweep).

        if (!cancelled) {
          setBrainId(pinnedBrainId)
          setModels(parsed)
          if (!selectedModelId && parsed.length > 0) {
            // Seed with the configured brain when present; otherwise the
            // first candidate. The chat route's resolver applies the same
            // brain-first priority server-side, so this only mirrors the
            // effective default into the UI.
            const seed =
              pinnedBrainId && parsed.some((m) => m.id === pinnedBrainId)
                ? pinnedBrainId
                : parsed[0].id
            onSelect(seed)
          }
        }
      } catch {
        // Fetch failed — models will remain empty
      } finally {
        if (!cancelled) setIsLoadingModels(false)
      }
    }

    void loadModels()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on click-outside
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isDropdownOpen])

  // Close dropdown on Escape
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isDropdownOpen])

  const selectedModel = models.find((m) => m.id === selectedModelId)
  const hasNoModels = !isLoadingModels && models.length === 0
  const displayName = isLoadingModels
    ? 'Loading models...'
    : selectedModel
      ? selectedModel.name
      : 'Select a model'

  // Group models by provider
  const grouped = models.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    const group = m.provider || 'other'
    if (!acc[group]) acc[group] = []
    acc[group].push(m)
    return acc
  }, {})

  // VIS-09: Empty state — show a CTA button that deep-links into Admin → Providers
  // instead of a plain-text dead-end "No models — configure in Admin → Providers".
  if (hasNoModels) {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => onConfigureProviders?.()}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium',
            'bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)] border border-[var(--dojo-primary)]/30',
            'hover:bg-[var(--dojo-primary)]/20 focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
            'motion-safe:transition-colors',
          )}
          aria-label="Configure providers in Admin"
        >
          <Plug className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">No models — configure providers</span>
        </button>
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => models.length > 0 && setIsDropdownOpen(!isDropdownOpen)}
        disabled={models.length === 0 && !isLoadingModels}
        className={cn(
          'flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs',
          'bg-[var(--bg-tertiary)] text-[var(--foreground)] border border-[var(--border-subtle)]',
          'hover:border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'motion-safe:transition-colors',
        )}
        aria-haspopup="listbox"
        aria-expanded={isDropdownOpen}
        aria-label="Select model"
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 ml-2 flex-shrink-0 motion-safe:transition-transform',
            isDropdownOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isDropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg max-h-48 overflow-y-auto"
          role="listbox"
          aria-label="Available models"
        >
          {Object.entries(grouped).map(([provider, providerModels]) => (
            <div key={provider}>
              <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold bg-[var(--bg-tertiary)]">
                {provider}
              </div>
              {providerModels.map((model) => (
                <button
                  key={model.id}
                  role="option"
                  aria-selected={model.id === selectedModelId}
                  onClick={() => {
                    onSelect(model.id)
                    setIsDropdownOpen(false)
                  }}
                  className={cn(
                    'flex items-center justify-between gap-2 w-full px-3 py-1.5 text-xs text-left',
                    'hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors',
                    model.id === selectedModelId
                      ? 'text-[var(--primary)] font-medium'
                      : 'text-[var(--foreground)]',
                  )}
                >
                  <span className="truncate">{model.name}</span>
                  {model.id === brainId && (
                    <span
                      className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--jade)' }}
                      aria-label="Sensei brain"
                      title="Pinned Sensei brain"
                    >
                      brain
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
