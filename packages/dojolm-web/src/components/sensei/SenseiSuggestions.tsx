/**
 * File: SenseiSuggestions.tsx
 * Purpose: Contextual quick-action suggestion pills for Sensei chat
 * Story: SH7.2
 * Index:
 * - SUGGESTIONS_BY_MODULE map (line 13)
 * - SenseiSuggestions component (line 47)
 */

'use client'

import type { NavId } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Suggestion map keyed by NavId
// ---------------------------------------------------------------------------

const SUGGESTIONS_BY_MODULE: Record<string, readonly string[]> = {
  dashboard: ['Show platform stats', 'Check guard status', 'Show leaderboard'],
  scanner: ['Scan a prompt', 'Explain findings', 'Show scanner stats'],
  guard: ['Check guard status', 'Show guard audit log', 'Explain guard modes'],
  llm: ['List configured models', 'Run a security test', 'Show leaderboard'],
  compliance: ['Show compliance gaps', 'Generate a report', 'Which frameworks?'],
  adversarial: ['Generate attack payloads', 'Run an orchestrator', 'Plan a multi-turn attack'],
  strategic: ['Launch arena battle', 'Show DNA analysis', 'Show warrior leaderboard'],
  armory: ['Scan a payload', 'Scan file for threats', 'Show scanner stats'],
  'ronin-hub': ['Show ecosystem findings', 'List test results', 'Explain Ronin Hub'],
  sengoku: ['List campaigns', 'Create a campaign', 'View test results'],
  kotoba: ['Scan a prompt', 'Run a test', 'List models'],
  admin: ['Show stats', 'Show guard audit', 'Show leaderboard'],
}

const DEFAULT_SUGGESTIONS: readonly string[] = [
  'What can I do?',
  'Show platform stats',
  'List configured models',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SenseiSuggestionsProps {
  readonly activeModule: NavId
  readonly onSend: (text: string) => void
}

export function SenseiSuggestions({ activeModule, onSend }: SenseiSuggestionsProps) {
  const suggestions = SUGGESTIONS_BY_MODULE[activeModule] ?? DEFAULT_SUGGESTIONS

  return (
    <ul
      className="flex flex-wrap gap-2 list-none p-0 m-0"
      role="list"
      aria-label="Suggested prompts"
    >
      {suggestions.map((text) => (
        <li key={text}>
          <button
            onClick={() => onSend(text)}
            className="px-3 py-1.5 text-xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--primary)] hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors whitespace-nowrap"
          >
            {text}
          </button>
        </li>
      ))}
    </ul>
  )
}
