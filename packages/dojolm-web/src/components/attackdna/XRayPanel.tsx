/**
 * File: XRayPanel.tsx
 * Purpose: X-Ray sub-panel for AttackDNA — explains why attacks work
 * Story: H27.3
 * Index:
 * - PatternCard component (line 75)
 * - ExplanationView component (line 116)
 * - XRayPanel component (line 225)
 */

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Zap,
  BookOpen,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types (mirror bu-tpi/xray types without importing Node-side code)
// ---------------------------------------------------------------------------

interface AttackPattern {
  id: string
  name: string
  category: string
  description: string
  bypassMechanism: string
  bypasses: string[]
  mitigations: string[]
  keywords: string[]
}

interface XRayPanelProps {
  patterns?: AttackPattern[]
  selectedFindingId?: string
  onNavigateToForge?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Static knowledge base summary (loaded client-side, no Node.js deps)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  'prompt-injection': { label: 'Prompt Injection', color: 'text-red-400' },
  'jailbreak': { label: 'Jailbreak', color: 'text-orange-400' },
  'encoding': { label: 'Encoding', color: 'text-yellow-400' },
  'structural': { label: 'Structural', color: 'text-blue-400' },
  'multimodal': { label: 'Multimodal', color: 'text-purple-400' },
  'webmcp': { label: 'WebMCP', color: 'text-cyan-400' },
  'supply-chain': { label: 'Supply Chain', color: 'text-amber-400' },
  'model-theft': { label: 'Model Theft', color: 'text-pink-400' },
  'dos': { label: 'DoS', color: 'text-rose-400' },
  'bias': { label: 'Bias', color: 'text-emerald-400' },
  'output-manipulation': { label: 'Output Manipulation', color: 'text-indigo-400' },
  'session': { label: 'Session', color: 'text-teal-400' },
  'agent': { label: 'Agent', color: 'text-violet-400' },
}

// ---------------------------------------------------------------------------
// PatternCard
// ---------------------------------------------------------------------------

function PatternCard({
  pattern,
  isSelected,
  onSelect,
}: {
  pattern: AttackPattern
  isSelected: boolean
  onSelect: () => void
}) {
  const catInfo = CATEGORY_LABELS[pattern.category] || { label: pattern.category, color: 'text-muted-foreground' }

  return (
    <button
      role="listitem"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors',
        'hover:bg-[var(--bg-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
        'min-h-[44px]',
        isSelected
          ? 'border-[var(--dojo-primary)] bg-[var(--bg-tertiary)]'
          : 'border-[var(--border)]'
      )}
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`Attack pattern: ${pattern.name}`}
    >
      <div className="flex items-start gap-2">
        <Zap className="h-4 w-4 mt-0.5 shrink-0 text-[var(--dojo-primary)]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{pattern.name}</p>
          <p className={cn('text-xs', catInfo.color)}>{catInfo.label}</p>
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// ExplanationView
// ---------------------------------------------------------------------------

function ExplanationView({
  pattern,
  onNavigateToForge,
}: {
  pattern: AttackPattern
  onNavigateToForge?: () => void
}) {
  const [showMitigations, setShowMitigations] = useState(true)

  return (
    <div className="space-y-4">
      {/* Pattern Name & Category */}
      <div>
        <h3 className="text-lg font-semibold">{pattern.name}</h3>
        <p className={cn(
          'text-sm',
          (CATEGORY_LABELS[pattern.category]?.color) || 'text-muted-foreground'
        )}>
          {CATEGORY_LABELS[pattern.category]?.label || pattern.category}
        </p>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 mt-0.5 shrink-0 text-[var(--dojo-primary)]" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{pattern.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Why It Works */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium mb-1">Why It Works</p>
              <p className="text-sm text-muted-foreground">
                This technique works because {pattern.bypassMechanism}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What It Bypasses */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium mb-1">Bypasses</p>
              <ul className="list-disc list-inside space-y-1" role="list">
                {pattern.bypasses.map((b) => (
                  <li key={b} className="text-sm text-muted-foreground" role="listitem">{b}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mitigations (collapsible) */}
      <Card>
        <CardContent className="p-3">
          <button
            onClick={() => setShowMitigations(!showMitigations)}
            className="flex items-center gap-2 w-full text-left min-h-[44px]"
            aria-expanded={showMitigations}
          >
            <Wrench className="h-4 w-4 shrink-0 text-green-400" aria-hidden="true" />
            <p className="text-sm font-medium">Suggested Mitigations</p>
            {showMitigations
              ? <ChevronDown className="h-4 w-4 ml-auto" aria-hidden="true" />
              : <ChevronRight className="h-4 w-4 ml-auto" aria-hidden="true" />
            }
          </button>
          {showMitigations && (
            <ul className="list-disc list-inside space-y-1 mt-2 ml-6" role="list">
              {pattern.mitigations.map((m) => (
                <li key={m} className="text-sm text-muted-foreground" role="listitem">{m}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Link to Forge Defense (H22) */}
      {onNavigateToForge && (
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateToForge}
          className="gap-2"
        >
          <Shield className="h-4 w-4" aria-hidden="true" />
          Open Forge Defense
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// XRayPanel
// ---------------------------------------------------------------------------

export function XRayPanel({
  patterns = [],
  selectedFindingId,
  onNavigateToForge,
  className,
}: XRayPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(selectedFindingId || null)

  // Sync selectedId when parent changes selectedFindingId prop
  useEffect(() => {
    if (selectedFindingId !== undefined) {
      setSelectedId(selectedFindingId)
    }
  }, [selectedFindingId])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const filteredPatterns = useMemo(() => {
    if (!searchQuery.trim()) return patterns
    const q = searchQuery.toLowerCase()
    return patterns.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.keywords.some(kw => kw.toLowerCase().includes(q))
    )
  }, [patterns, searchQuery])

  const selectedPattern = useMemo(
    () => patterns.find(p => p.id === selectedId),
    [patterns, selectedId]
  )

  // Group patterns by category
  const groupedPatterns = useMemo(() => {
    const groups: Record<string, AttackPattern[]> = {}
    for (const p of filteredPatterns) {
      if (!groups[p.category]) groups[p.category] = []
      groups[p.category].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredPatterns])

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', className)}>
      {/* Left: Pattern browser */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
            Attack Patterns
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              {filteredPatterns.length} patterns
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search patterns..."
              aria-label="Search attack patterns"
              className="pl-10"
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-4 pr-1" role="list" aria-label="Attack patterns">
            {groupedPatterns.map(([category, pats]) => {
              const catInfo = CATEGORY_LABELS[category] || { label: category, color: 'text-muted-foreground' }
              return (
                <div key={category}>
                  <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', catInfo.color)}>
                    {catInfo.label} ({pats.length})
                  </p>
                  <div className="space-y-1">
                    {pats.map((p) => (
                      <PatternCard
                        key={p.id}
                        pattern={p}
                        isSelected={selectedId === p.id}
                        onSelect={() => setSelectedId(p.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            {filteredPatterns.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No patterns match your search.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right: Explanation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
            Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPattern ? (
            <ExplanationView
              pattern={selectedPattern}
              onNavigateToForge={onNavigateToForge}
            />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p className="text-sm">Select a pattern to see its explanation</p>
              <p className="text-xs mt-1">
                Pattern details include bypass mechanisms, defenses bypassed, and suggested mitigations
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
