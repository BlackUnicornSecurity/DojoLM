/**
 * File: SenseiCapabilityPanel.tsx
 * Purpose: Registry-backed capability summary panel for the Sensei drawer
 * Story: 6.1.1 — surface existing SENSEI_TOOLS categories; no new features added
 * Index:
 * - ToolGroup type + buildGroups (line ~20)
 * - SenseiCapabilityPanel component (line ~55)
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
    { label: 'Query', colorClass: 'text-blue-400', tools: query },
    { label: 'Write', colorClass: 'text-orange-400', tools: write },
    { label: 'Confirm', colorClass: 'text-amber-400', tools: confirm },
    { label: 'Navigate', colorClass: 'text-emerald-400', tools: navigate },
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
      >
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3" aria-hidden="true" />
          <span>{totalTools} capabilities</span>
          <span className="flex items-center gap-1 ml-1" aria-hidden="true">
            {groups.map((g) => (
              <span key={g.label} className={cn('font-medium', g.colorClass)}>
                {g.tools.length}
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
