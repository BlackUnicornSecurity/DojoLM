'use client'

// LiveInferencePanel — Collapsible bottom panel showing attacker prompt + defender response
// Story: 16.3

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, Copy, Check } from 'lucide-react'
import type { MatchRound } from '@/lib/arena-types'

// ===========================================================================
// Types
// ===========================================================================

interface LiveInferencePanelProps {
  rounds: MatchRound[]
  fighterNames: Record<string, string>
}

// ===========================================================================
// Component
// ===========================================================================

export function LiveInferencePanel({ rounds, fighterNames }: LiveInferencePanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const activeRound = useMemo(() => {
    if (rounds.length === 0) return null
    const roundNum = selectedRound ?? rounds[rounds.length - 1].roundNumber
    return rounds.find((r) => r.roundNumber === roundNum) ?? null
  }, [rounds, selectedRound])

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Clipboard not available
    }
  }, [])

  return (
    <div className="border-t border-[var(--border-subtle)]">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors"
        aria-expanded={!collapsed}
        aria-controls="inference-panel"
      >
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Inference Details
        </span>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {!collapsed && (
        <div id="inference-panel" className="px-4 pb-4 space-y-3">
          {/* Round selector */}
          {rounds.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {rounds.map((round) => (
                <button
                  key={round.roundNumber}
                  type="button"
                  onClick={() => setSelectedRound(round.roundNumber)}
                  className={cn(
                    'px-3 py-1 text-xs font-mono rounded-full shrink-0',
                    'motion-safe:transition-colors',
                    (selectedRound ?? rounds[rounds.length - 1].roundNumber) === round.roundNumber
                      ? 'bg-[var(--bg-quaternary)] text-[var(--foreground)]'
                      : 'text-muted-foreground hover:bg-[var(--bg-tertiary)]'
                  )}
                  aria-label={`View round ${round.roundNumber}`}
                >
                  R{round.roundNumber}
                </button>
              ))}
            </div>
          )}

          {activeRound ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Attacker prompt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--danger)]">
                    Attacker: {fighterNames[activeRound.attackerId] ?? activeRound.attackerId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(activeRound.prompt, 'prompt')}
                    className="h-6 px-2"
                    aria-label="Copy prompt"
                  >
                    {copiedField === 'prompt' ? (
                      <Check className="w-3 h-3 text-[var(--success)]" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <pre className="text-xs font-mono p-3 rounded-lg bg-[var(--bg-tertiary)] overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[var(--foreground)]">
                  {activeRound.prompt}
                </pre>
              </div>

              {/* Defender response */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--success)]">
                      Defender: {fighterNames[activeRound.defenderId] ?? activeRound.defenderId}
                    </span>
                    <Badge
                      variant={activeRound.scanVerdict === 'BLOCK' ? 'error' : 'success'}
                      className="text-xs"
                    >
                      {activeRound.scanVerdict}
                    </Badge>
                    {activeRound.scanSeverity && (
                      <Badge
                        variant={
                          activeRound.scanSeverity === 'CRITICAL' ? 'critical' :
                          activeRound.scanSeverity === 'WARNING' ? 'warning' : 'info'
                        }
                        className="text-xs"
                      >
                        {activeRound.scanSeverity}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(activeRound.response, 'response')}
                    className="h-6 px-2"
                    aria-label="Copy response"
                  >
                    {copiedField === 'response' ? (
                      <Check className="w-3 h-3 text-[var(--success)]" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <pre className="text-xs font-mono p-3 rounded-lg bg-[var(--bg-tertiary)] overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[var(--foreground)]">
                  {activeRound.response}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No round data available yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
