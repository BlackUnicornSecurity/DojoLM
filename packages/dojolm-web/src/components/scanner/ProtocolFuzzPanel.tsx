'use client'

/**
 * File: ProtocolFuzzPanel.tsx
 * Purpose: Protocol fuzzing panel for Atemi Lab / Scanner
 * Story: H23.2
 * Index:
 * - PROTOCOLS constant (line 17)
 * - MUTATION_TYPES constant (line 19)
 * - FuzzResult interface (line 28)
 * - MOCK_RESULTS data (line 35)
 * - ProtocolFuzzPanel component (line 80)
 */

import { useState, useCallback } from 'react'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Zap, Loader2 } from 'lucide-react'

// MOCK DATA — replace with live data when backend is available

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

interface FuzzResult {
  id: string
  protocol: Protocol
  type: MutationType
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
}

const MOCK_RESULTS: FuzzResult[] = [
  {
    id: 'FUZZ-001',
    protocol: 'MCP',
    type: 'field-injection',
    severity: 'critical',
    description: 'Tool name field accepts arbitrary code injection via nested JSON payload.',
  },
  {
    id: 'FUZZ-002',
    protocol: 'HTTP API',
    type: 'type-coercion',
    severity: 'high',
    description: 'Integer parameter coerced to string bypasses input validation on /api/execute.',
  },
  {
    id: 'FUZZ-003',
    protocol: 'JSON-RPC',
    type: 'malformed-structure',
    severity: 'medium',
    description: 'Missing "jsonrpc" version field accepted without error, violating spec compliance.',
  },
  {
    id: 'FUZZ-004',
    protocol: 'MCP',
    type: 'boundary-values',
    severity: 'high',
    description: 'Context window overflow via 128K token payload causes unhandled memory allocation.',
  },
  {
    id: 'FUZZ-005',
    protocol: 'HTTP API',
    type: 'parameter-pollution',
    severity: 'medium',
    description: 'Duplicate query parameters merged inconsistently, enabling filter bypass.',
  },
]

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-[var(--status-block)]/15 text-[var(--status-block)]',
  high: 'bg-[var(--dojo-primary)]/15 text-[var(--dojo-primary)]',
  medium: 'bg-[var(--severity-medium)]/15 text-[var(--severity-medium)]',
  low: 'bg-[var(--status-allow)]/15 text-[var(--status-allow)]',
  info: 'bg-[var(--bu-electric)]/15 text-[var(--bu-electric)]',
}

export function ProtocolFuzzPanel() {
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>('MCP')
  const [selectedTypes, setSelectedTypes] = useState<Set<MutationType>>(new Set(MUTATION_TYPES))
  const [fuzzing, setFuzzing] = useState(false)
  const [results, setResults] = useState<FuzzResult[] | null>(null)

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

  const handleFuzz = useCallback(() => {
    setFuzzing(true)
    setResults(null)
    // Mock async fuzz run
    setTimeout(() => {
      setFuzzing(false)
      setResults(MOCK_RESULTS)
    }, 2000)
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
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150',
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
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-150',
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

      {/* Start Button */}
      <Button variant="gradient" onClick={handleFuzz} disabled={fuzzing} className="mb-5">
        {fuzzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Fuzzing...
          </>
        ) : (
          'Start Fuzz'
        )}
      </Button>

      {/* Results Table */}
      {results && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">ID</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Protocol</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Severity</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--overlay-subtle)]">
                  <td className="py-2.5 px-2 font-mono text-xs">{r.id}</td>
                  <td className="py-2.5 px-2 text-xs">{r.protocol}</td>
                  <td className="py-2.5 px-2 text-xs whitespace-nowrap">{r.type}</td>
                  <td className="py-2.5 px-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded uppercase', SEVERITY_BADGE[r.severity])}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-muted-foreground">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlowCard>
  )
}
