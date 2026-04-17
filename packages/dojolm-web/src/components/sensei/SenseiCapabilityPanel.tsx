/**
 * File: SenseiCapabilityPanel.tsx
 * Purpose: Registry-backed capability summary panel for the Sensei drawer
 * Story: 6.1.1 — surface existing SENSEI_TOOLS categories; no new features added
 * Index:
 * - ToolGroup type + buildGroups (line ~20)
 * - SenseiCapabilityPanel component (line ~55)
 *
 * VIS-10 (2026-04-17): Header pips (e.g. "19 / 8 / 4 / 2") now have an accessible
 * legend via a native `title` tooltip on each number, plus an inline
 * "Query / Write / Confirm / Navigate" label row that appears under the header.
 */

'use client'

import { useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SENSEI_TOOLS } from '@/lib/sensei/tool-definitions'

// ---------------------------------------------------------------------------
// Tool group classification — derived from registry flags, no new data
// ---------------------------------------------------------------------------

interface ToolGroup {
  readonly label: string
  readonly colorClass: string
  readonly tools: readonly string[]
  readonly description: string
}

function buildGroups(): readonly ToolGroup[] {
  const navigate: string[] = []
  const query: string[] = []
  const confirm: string[] = []
  const write: string[] = []

  for (const tool of SENSEI_TOOLS) {
    if (tool.endpoint === '__client__') {
      navigate.push(tool.name)
    } else if (tool.mutating) {
      write.push(tool.name)
    } else if (tool.requiresConfirmation) {
      confirm.push(tool.name)
    } else {
      query.push(tool.name)
    }
  }

  return [
    {
      label: 'Query',
      colorClass: 'text-blue-400',
      tools: query,
      description: 'Read-only tools that fetch data (no side effects).',
    },
    {
      label: 'Write',
      colorClass: 'text-orange-400',
      tools: write,
      description: 'Mutating tools that create or modify records.',
    },
    {
      label: 'Confirm',
      colorClass: 'text-amber-400',
      tools: confirm,
      description: 'Tools that require explicit confirmation before running.',
    },
    {
      label: 'Navigate',
      colorClass: 'text-emerald-400',
      tools: navigate,
      description: 'Client-side navigation shortcuts (no server call).',
    },
  ] as const
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SenseiCapabilityPanel() {
  const [expanded, setExpanded] = useState(false)
  const groups = buildGroups()
  const totalTools = SENSEI_TOOLS.length

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
        aria-describedby="capability-panel-legend"
        title={groups
          .map((g) => `${g.label}: ${g.tools.length} (${g.description})`)
          .join('\n')}
      >
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3" aria-hidden="true" />
          <span>{totalTools} capabilities</span>
          <span
            className="flex items-center gap-1 ml-1"
            data-testid="capability-panel-pips"
          >
            {groups.map((g, i) => (
              <span key={g.label} className="flex items-center gap-1">
                {i > 0 && <span className="text-[var(--text-tertiary)]">/</span>}
                <span
                  className={cn('font-medium', g.colorClass)}
                  title={`${g.label}: ${g.tools.length} — ${g.description}`}
                  aria-label={`${g.tools.length} ${g.label.toLowerCase()}`}
                >
                  {g.tools.length}
                </span>
              </span>
            ))}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'w-3 h-3 motion-safe:transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* VIS-10: Inline legend so the pips aren't opaque without expanding.
          Linked to the toggle via aria-describedby so screen readers announce
          it alongside the button label. aria-hidden is dropped so the legend
          is part of the accessibility tree. */}
      <div
        id="capability-panel-legend"
        className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground"
        data-testid="capability-panel-legend"
      >
        {groups.map((g, i) => (
          <span key={g.label} className="flex items-center gap-1">
            {i > 0 && <span className="opacity-50">·</span>}
            <span className={cn('font-medium', g.colorClass)}>{g.label}</span>
            <span className="font-mono">{g.tools.length}</span>
          </span>
        ))}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2" data-testid="capability-panel-expanded">
          {groups.map((g) => (
            <div key={g.label} data-testid={`group-${g.label.toLowerCase()}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    g.colorClass,
                  )}
                >
                  {g.label}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  ({g.tools.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {g.tools.map((name) => (
                  <span
                    key={name}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
