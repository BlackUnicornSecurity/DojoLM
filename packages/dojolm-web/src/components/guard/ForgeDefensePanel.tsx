'use client'

/**
 * File: ForgeDefensePanel.tsx
 * Purpose: Defense recommendation panel with template cards grouped by category
 * Story: H22.3
 * Index:
 * - CATEGORIES constant (line 18)
 * - DefenseTemplate interface (line 31)
 * - MOCK_TEMPLATES data (line 38)
 * - StarRating sub-component (line 128)
 * - ForgeDefensePanel component (line 140)
 */

import { useState, useMemo, useCallback } from 'react'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Shield, Star, Check } from 'lucide-react'

// MOCK DATA — replace with live data when backend is available

const CATEGORIES = [
  'system-prompt',
  'input-validation',
  'output-filtering',
  'rate-limiting',
  'context-isolation',
  'audit-logging',
  'encoding-defense',
  'boundary-enforcement',
] as const

type Category = (typeof CATEGORIES)[number]

interface DefenseTemplate {
  id: string
  name: string
  description: string
  category: Category
  effectiveness: number // 1-5
}

const MOCK_TEMPLATES: DefenseTemplate[] = [
  {
    id: 'd1', name: 'Strict Role Anchoring', category: 'system-prompt',
    description: 'Anchor the system prompt with immutable role instructions that resist override attempts.',
    effectiveness: 5,
  },
  {
    id: 'd2', name: 'Instruction Delimiter Guard', category: 'system-prompt',
    description: 'Use unique delimiters to separate system instructions from user input.',
    effectiveness: 4,
  },
  {
    id: 'd3', name: 'Input Sanitizer', category: 'input-validation',
    description: 'Strip or escape injection patterns, control characters, and encoding tricks from user input.',
    effectiveness: 4,
  },
  {
    id: 'd4', name: 'Token Length Limiter', category: 'input-validation',
    description: 'Enforce strict token limits on user input to prevent context overflow attacks.',
    effectiveness: 3,
  },
  {
    id: 'd5', name: 'PII Redaction Filter', category: 'output-filtering',
    description: 'Scan model output for PII patterns and redact before delivery.',
    effectiveness: 5,
  },
  {
    id: 'd6', name: 'Harmful Content Blocker', category: 'output-filtering',
    description: 'Block responses matching harmful content classifiers.',
    effectiveness: 4,
  },
  {
    id: 'd7', name: 'Sliding Window Limiter', category: 'rate-limiting',
    description: 'Apply sliding-window rate limits per user session to throttle abuse attempts.',
    effectiveness: 3,
  },
  {
    id: 'd8', name: 'Session Sandbox', category: 'context-isolation',
    description: 'Isolate each user session context to prevent cross-session data leakage.',
    effectiveness: 5,
  },
  {
    id: 'd9', name: 'Full Audit Trail', category: 'audit-logging',
    description: 'Log all prompts, responses, and guard actions with tamper-evident hashing.',
    effectiveness: 4,
  },
  {
    id: 'd10', name: 'Unicode Normalization', category: 'encoding-defense',
    description: 'Normalize unicode input to NFC form to prevent homoglyph and encoding bypass attacks.',
    effectiveness: 3,
  },
  {
    id: 'd11', name: 'Tool Call Whitelist', category: 'boundary-enforcement',
    description: 'Restrict tool/function calls to an explicit allowlist with parameter validation.',
    effectiveness: 5,
  },
  {
    id: 'd12', name: 'Response Scope Enforcer', category: 'boundary-enforcement',
    description: 'Validate that model responses stay within the defined operational scope.',
    effectiveness: 4,
  },
]

const CATEGORY_LABELS: Record<Category, string> = {
  'system-prompt': 'System Prompt',
  'input-validation': 'Input Validation',
  'output-filtering': 'Output Filtering',
  'rate-limiting': 'Rate Limiting',
  'context-isolation': 'Context Isolation',
  'audit-logging': 'Audit Logging',
  'encoding-defense': 'Encoding Defense',
  'boundary-enforcement': 'Boundary Enforcement',
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`Effectiveness: ${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'w-3.5 h-3.5',
            i < value ? 'fill-[var(--severity-medium)] text-[var(--severity-medium)]' : 'text-muted-foreground/30'
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export function ForgeDefensePanel() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [applied, setApplied] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return MOCK_TEMPLATES
    return MOCK_TEMPLATES.filter((t) => t.category === activeCategory)
  }, [activeCategory])

  const handleApply = useCallback((id: string) => {
    setApplied((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  return (
    <GlowCard glow="subtle" className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-[var(--dojo-primary)]" aria-hidden="true" />
        <h3 className="text-base font-semibold">Forge Defense</h3>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
            activeCategory === 'all'
              ? 'bg-[var(--dojo-primary)] text-white'
              : 'bg-muted text-muted-foreground hover:bg-[var(--overlay-active)] hover:text-foreground'
          )}
          aria-pressed={activeCategory === 'all'}
        >
          All ({MOCK_TEMPLATES.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = MOCK_TEMPLATES.filter((t) => t.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                activeCategory === cat
                  ? 'bg-[var(--dojo-primary)] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-[var(--overlay-active)] hover:text-foreground'
              )}
              aria-pressed={activeCategory === cat}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          )
        })}
      </div>

      {/* Template Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((template) => {
          const isApplied = applied.has(template.id)
          return (
            <div
              key={template.id}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-medium truncate">{template.name}</h4>
                  <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[template.category]}</span>
                </div>
                <StarRating value={template.effectiveness} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{template.description}</p>
              <div className="mt-auto pt-2">
                <Button
                  variant={isApplied ? 'ghost' : 'default'}
                  size="sm"
                  onClick={() => handleApply(template.id)}
                  disabled={isApplied}
                  className="w-full"
                >
                  {isApplied ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Applied
                    </>
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </GlowCard>
  )
}
