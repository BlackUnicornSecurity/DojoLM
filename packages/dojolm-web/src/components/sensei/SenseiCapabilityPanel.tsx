// SPDX-License-Identifier: Apache-2.0
/**
 * File: SenseiCapabilityPanel.tsx
 * Purpose: Capability summary panel for the Sensei drawer, sourced from the
 *          role + OSS/EE tier-filtered tool set (not the raw registry).
 * Story: 6.1.1 · Sensei Rework Pillar B step 9
 * Index:
 *   - tone/group config (line ~40)
 *   - SenseiCapabilityPanel component (line ~85)
 *
 * Sensei Rework (Pillar B, step 9): the panel previously read the hardcoded
 * `SENSEI_TOOLS` array directly, so it described EE-tier tools on an OSS
 * build and tools above the caller's role. It now fetches
 * `GET /api/sensei/capabilities`, which returns the SAME role/tier-filtered
 * set the chat route hands the model, plus the resolved native/XML
 * tool-calling mode for the pinned Sensei brain (rendered as a house `chip`
 * badge). The fetch is gated on `active` so it only fires when the drawer is
 * actually open, not on every authenticated page load.
 *
 * VIS-10: header pips keep an accessible legend (native `title` per number +
 * an inline label row). Colours are house tone tokens — never raw Tailwind
 * palette values.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { canAccessProtectedApi } from '@/lib/client-auth-access'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

// ---------------------------------------------------------------------------
// Wire shape (mirrors GET /api/sensei/capabilities)
// ---------------------------------------------------------------------------

type CapabilityKind = 'query' | 'write' | 'confirm' | 'navigate'
type ToolCallingMode = 'native' | 'xml'

interface CapabilityToolView {
  readonly name: string
  readonly kind: CapabilityKind
}

interface CapabilitiesData {
  readonly mode: ToolCallingMode | null
  readonly tools: readonly CapabilityToolView[]
}

// ---------------------------------------------------------------------------
// Group presentation — house tone tokens (no Tailwind palette colours)
// ---------------------------------------------------------------------------

interface GroupConfig {
  readonly kind: CapabilityKind
  readonly label: string
  /** House tone CSS variable (matches the `.chip` tone family). */
  readonly toneVar: string
  readonly description: string
}

const GROUP_CONFIG: readonly GroupConfig[] = [
  { kind: 'query', label: 'Query', toneVar: 'var(--steel-lg)', description: 'Read-only tools that fetch data (no side effects).' },
  { kind: 'write', label: 'Write', toneVar: 'var(--torii-text-dim)', description: 'Mutating tools that create or modify records.' },
  { kind: 'confirm', label: 'Confirm', toneVar: 'var(--gold-text)', description: 'Tools that require explicit confirmation before running.' },
  { kind: 'navigate', label: 'Navigate', toneVar: 'var(--jade)', description: 'Client-side navigation shortcuts (no server call).' },
] as const

interface ResolvedGroup extends GroupConfig {
  readonly tools: readonly string[]
}

function buildGroups(tools: readonly CapabilityToolView[]): readonly ResolvedGroup[] {
  return GROUP_CONFIG.map((g) => ({
    ...g,
    tools: tools.filter((t) => t.kind === g.kind).map((t) => t.name),
  }))
}

// ---------------------------------------------------------------------------
// Mode badge — house `.chip` primitive (native = jade dot, XML = ghost)
// ---------------------------------------------------------------------------

const MODE_BADGE: Record<ToolCallingMode, { tone: string; label: string; title: string }> = {
  native: { tone: 'jade', label: 'native', title: 'Provider-native function-calling' },
  xml: { tone: 'ghost', label: 'XML', title: 'Universal <tool_call> XML fallback' },
}

function ModeBadge({ mode }: { mode: ToolCallingMode }) {
  const m = MODE_BADGE[mode]
  return (
    <span
      className={cn('chip', m.tone)}
      role="status"
      data-testid="capability-mode-badge"
      data-mode={mode}
      aria-label={`Tool-calling mode: ${m.label}`}
      title={m.title}
    >
      <span className="dot" aria-hidden="true" />
      {m.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SenseiCapabilityPanelProps {
  /**
   * Whether the host drawer is open. The capabilities fetch fires once the
   * panel first becomes active, so it doesn't hit the API on every
   * authenticated page load (the drawer mounts on every page). Defaults to
   * `true` for standalone use.
   */
  readonly active?: boolean
}

export function SenseiCapabilityPanel({ active = true }: SenseiCapabilityPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [data, setData] = useState<CapabilitiesData | null>(null)
  // A ref latch (not state) so completing a fetch doesn't re-register the
  // effect, and so a load that is CANCELLED mid-flight (drawer closed before
  // it resolved) stays UN-latched — reopening the drawer retries it.
  const loadedRef = useRef(false)

  // Fetch once, the first time the panel becomes active.
  useEffect(() => {
    if (!active || loadedRef.current) return
    let cancelled = false

    async function load() {
      try {
        if (!(await canAccessProtectedApi())) return
        const res = await fetchWithAuth('/api/sensei/capabilities')
        if (!res.ok || cancelled) return
        const body: unknown = await res.json()
        if (cancelled || typeof body !== 'object' || body === null) return
        const raw = body as Record<string, unknown>
        const toolsRaw = Array.isArray(raw.tools) ? raw.tools : []
        const tools: CapabilityToolView[] = toolsRaw
          .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
          .map((t) => ({
            name: String(t.name ?? ''),
            kind: (['query', 'write', 'confirm', 'navigate'] as const).includes(
              t.kind as CapabilityKind,
            )
              ? (t.kind as CapabilityKind)
              : 'query',
          }))
          .filter((t) => t.name.length > 0)
        const mode =
          raw.mode === 'native' || raw.mode === 'xml' ? (raw.mode as ToolCallingMode) : null
        if (!cancelled) {
          setData({ mode, tools })
          // Latch only on a real, applied result — failed/aborted loads retry.
          loadedRef.current = true
        }
      } catch {
        // Leave `data` null + un-latched — the panel shows its unavailable
        // state and retries when the drawer is next opened.
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [active])

  const groups = data ? buildGroups(data.tools) : []
  const totalTools = data?.tools.length ?? 0
  const ready = data !== null

  return (
    <div
      className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
      data-testid="capability-panel"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-xs text-[var(--text-tertiary)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
        aria-expanded={expanded}
        aria-label="Toggle capability summary"
        aria-describedby={ready ? 'capability-panel-legend' : undefined}
        title={groups
          .map((g) => `${g.label}: ${g.tools.length} (${g.description})`)
          .join('\n')}
      >
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3" aria-hidden="true" />
          <span>{ready ? `${totalTools} capabilities` : 'Capabilities'}</span>
          {ready && (
            <span
              className="flex items-center gap-1 ml-1"
              data-testid="capability-panel-pips"
            >
              {groups.map((g, i) => (
                <span key={g.label} className="flex items-center gap-1">
                  {i > 0 && <span className="text-[var(--text-tertiary)]">/</span>}
                  <span
                    className="font-medium"
                    style={{ color: g.toneVar }}
                    title={`${g.label}: ${g.tools.length} — ${g.description}`}
                    aria-label={`${g.tools.length} ${g.label.toLowerCase()}`}
                  >
                    {g.tools.length}
                  </span>
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {data?.mode && <ModeBadge mode={data.mode} />}
          <ChevronDown
            className={cn(
              'w-3 h-3 motion-safe:transition-transform',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* VIS-10: inline legend so the pips aren't opaque without expanding.
          Linked to the toggle via aria-describedby so screen readers announce
          it alongside the button label. */}
      {ready && (
        <div
          id="capability-panel-legend"
          className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-tertiary)]"
          data-testid="capability-panel-legend"
        >
          {groups.map((g, i) => (
            <span key={g.label} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-50">·</span>}
              <span className="font-medium" style={{ color: g.toneVar }}>
                {g.label}
              </span>
              <span className="font-mono">{g.tools.length}</span>
            </span>
          ))}
        </div>
      )}

      {expanded && ready && (
        <div className="mt-2 space-y-2" data-testid="capability-panel-expanded">
          {groups.map((g) => (
            <div key={g.label} data-testid={`group-${g.label.toLowerCase()}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: g.toneVar }}
                >
                  {g.label}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  ({g.tools.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {g.tools.map((name) => (
                  <span
                    key={name}
                    className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && !ready && (
        <div
          className="mt-2 text-[11px] text-[var(--text-tertiary)]"
          data-testid="capability-panel-unavailable"
        >
          Capability summary unavailable.
        </div>
      )}
    </div>
  )
}
