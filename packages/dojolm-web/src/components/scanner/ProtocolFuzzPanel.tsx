'use client'

/**
 * File: ProtocolFuzzPanel.tsx
 * Purpose: Protocol fuzzing panel for Atemi Lab / Scanner
 * Story: H23.2
 * Index:
 * - PROTOCOLS constant (line 17)
 * - MUTATION_TYPES constant (line 19)
 * - ProtocolFuzzPanel component (line 30)
 *
 * Note: Backend route not yet available. Start Fuzz button is disabled.
 */

import { useState, useCallback } from 'react'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Zap, Clock } from 'lucide-react'

const PROTOCOLS = ['MCP', 'HTTP API', 'JSON-RPC'] as const
type Protocol = (typeof PROTOCOLS)[number]

const MUTATION_TYPES = [
  'field-injection',
  'type-coercion',
  'boundary-values',
  'malformed-structure',
  'parameter-pollution',
] as const
type MutationType = (typeof MUTATION_TYPES)[number]

export function ProtocolFuzzPanel() {
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>('MCP')
  const [selectedTypes, setSelectedTypes] = useState<Set<MutationType>>(new Set(MUTATION_TYPES))

  const toggleType = useCallback((type: MutationType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size > 1) next.delete(type) // keep at least one
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  return (
    <GlowCard glow="subtle" className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-5 h-5 text-[var(--bu-electric)]" aria-hidden="true" />
        <h3 className="text-base font-semibold">Protocol Fuzzer</h3>
      </div>

      {/* Protocol Selector */}
      <div className="mb-4">
        <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Protocol</span>
        <div className="flex gap-2">
          {PROTOCOLS.map((proto) => (
            <button
              key={proto}
              onClick={() => setSelectedProtocol(proto)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 min-h-[44px] inline-flex items-center',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                selectedProtocol === proto
                  ? 'bg-[var(--bu-electric)] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-[var(--overlay-active)] hover:text-foreground'
              )}
              aria-pressed={selectedProtocol === proto}
            >
              {proto}
            </button>
          ))}
        </div>
      </div>

      {/* Mutation Type Chips */}
      <div className="mb-5">
        <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Mutation Types</span>
        <div className="flex flex-wrap gap-2">
          {MUTATION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-150 min-h-[44px] inline-flex items-center',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                selectedTypes.has(type)
                  ? 'bg-[var(--dojo-primary)] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-[var(--overlay-active)] hover:text-foreground'
              )}
              aria-pressed={selectedTypes.has(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Start Button — disabled: backend not yet available */}
      <Button
        variant="gradient"
        disabled
        aria-disabled="true"
        aria-describedby="protocol-fuzz-unavailable"
        className="mb-5"
      >
        Start Fuzz
      </Button>

      {/* Not-yet-available notice */}
      <div
        id="protocol-fuzz-unavailable"
        role="status"
        className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-muted-foreground"
      >
        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Protocol fuzzing is not yet available. The backend route is under development.</span>
      </div>
    </GlowCard>
  )
}
