/**
 * File: PlaybooksComposite.tsx
 * Purpose: Composite panel for all playbook-style testing: Custom Playbooks,
 *          Protocol Fuzzing, Agentic Testing, and WebMCP Testing.
 *          Extracted from AdversarialLab during Testing UX Consolidation.
 * Story: Testing UX Consolidation — Phase 3
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Zap,
  Bot,
  Globe,
  Clock,
} from 'lucide-react'
import { PlaybookRunner } from './PlaybookRunner'
import { ProtocolFuzzPanel } from '../scanner/ProtocolFuzzPanel'
import { AgenticLab } from '../agentic/AgenticLab'

// ---------------------------------------------------------------------------
// Available models for agentic lab
// ---------------------------------------------------------------------------

const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
] as const

// ---------------------------------------------------------------------------
// Sub-panel type
// ---------------------------------------------------------------------------

type PlaybookPanel = 'custom' | 'protocol-fuzz' | 'agentic' | 'webmcp'

const PANELS: ReadonlyArray<{ id: PlaybookPanel; label: string; icon: typeof BookOpen }> = [
  { id: 'custom', label: 'Custom', icon: BookOpen },
  { id: 'protocol-fuzz', label: 'Protocol Fuzz', icon: Zap },
  { id: 'agentic', label: 'Agentic', icon: Bot },
  { id: 'webmcp', label: 'WebMCP', icon: Globe },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlaybooksComposite() {
  const [activePanel, setActivePanel] = useState<PlaybookPanel>('custom')

  return (
    <div className="space-y-4">
      {/* Sub-panel pill switcher */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-lg w-fit">
        {PANELS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActivePanel(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md',
              'transition-colors min-h-[36px]',
              activePanel === id
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                : 'text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-tertiary)]',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {activePanel === 'custom' && <PlaybookRunner />}
      {activePanel === 'protocol-fuzz' && <ProtocolFuzzPanel />}
      {activePanel === 'agentic' && (
        <AgenticLab
          availableModels={AVAILABLE_MODELS.map((model) => ({
            id: model.id,
            name: model.name,
          }))}
        />
      )}
      {activePanel === 'webmcp' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              WebMCP Attack Testing
            </h3>
          </div>
          {/* Not-yet-available notice */}
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-muted-foreground"
          >
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>WebMCP attack testing is not yet available. The backend route is under development.</span>
          </div>
        </div>
      )}
    </div>
  )
}
