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
  dashboard: ['Platform overview', 'Run quick scan', 'Check guard status'],
  scanner: ['Scan a prompt', 'Explain findings', 'What modules detect?'],
  guard: ['Check guard status', 'Explain guard modes', 'Set guard to Samurai'],
  llm: ['Run a test', 'Compare models', 'List configured models'],
  compliance: ['Show compliance gaps', 'Export evidence', 'Which frameworks?'],
  adversarial: ['Browse attack skills', 'Start a session', 'What is Atemi Lab?'],
  strategic: ['Launch arena battle', 'Check threat feed', 'Show DNA analysis'],
  armory: ['Search fixtures', 'Explain categories', 'How many payloads?'],
  'ronin-hub': ['Submit a finding', 'Browse programs', 'Explain severity'],
  sengoku: ['Start campaign', 'View results', 'What is red teaming?'],
  kotoba: ['Optimize a prompt', 'Explain techniques', 'Show examples'],
  admin: ['Show stats', 'List API keys', 'System health'],
}

const DEFAULT_SUGGESTIONS: readonly string[] = [
  'What can I do?',
  'Platform overview',
  'Run quick scan',
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
      className="flex flex-wrap gap-2 px-1 py-2 list-none m-0 p-0"
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
