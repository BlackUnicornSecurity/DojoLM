/**
 * File: FuzzerPanel.tsx
 * Purpose: Fuzzer tab inside Payload Lab (Buki) — mutation-based fuzzing UI.
 * Story: Train 3 PR-4f.3
 *
 * Provides a UI for configuring and running fuzz sessions using the
 * bu-tpi/src/fuzzing/ engine. Supports grammar selection, mutation count,
 * anomaly detection threshold, and results display.
 *
 * Note: The fuzzing engine runs server-side via /api/buki/fuzz. This component
 * sends configuration and displays results — it does NOT run fuzzing in the
 * browser.
 */

'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shuffle, Play, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'

type FuzzerGrammar = 'prompt' | 'encoding' | 'structural'
type FuzzerStatus = 'idle' | 'running' | 'done' | 'error'

interface FuzzerResult {
  id: string
  input: string
  anomalyType: string | null
  isAnomaly: boolean
  score: number
  timestamp: string
}

const GRAMMAR_OPTIONS: { id: FuzzerGrammar; label: string; description: string }[] = [
  { id: 'prompt', label: 'Prompt Injection', description: 'Mutate prompt structures to find injection boundaries' },
  { id: 'encoding', label: 'Encoding Bypass', description: 'Test encoding-based evasion (Base64, Unicode, hex, URL)' },
  { id: 'structural', label: 'Structural Mutation', description: 'Fuzz JSON/XML/YAML structures for parser confusion' },
]

export function FuzzerPanel() {
  const [grammar, setGrammar] = useState<FuzzerGrammar>('prompt')
  const [mutationCount, setMutationCount] = useState(50)
  const [status, setStatus] = useState<FuzzerStatus>('idle')
  const [results, setResults] = useState<FuzzerResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    setStatus('running')
    setError(null)
    setResults([])

    try {
      const response = await fetch('/api/buki/fuzz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grammar, mutationCount }),
      })

      if (!response.ok) {
        if (response.status === 401) throw new Error('Authentication required — sign in to run fuzzer sessions')
        throw new Error(`Fuzz request failed (${response.status})`)
      }

      const data = await response.json() as { results: FuzzerResult[] }
      setResults(data.results ?? [])
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }, [grammar, mutationCount])

  const anomalyCount = results.filter(r => r.isAnomaly).length
  const cleanCount = results.length - anomalyCount

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            Fuzz Configuration
          </CardTitle>
          <CardDescription>
            Select a grammar, set mutation count, and launch a fuzz session.
            The fuzzer generates mutated inputs from the grammar and tests
            them against the scanner for anomaly detection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grammar selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Grammar
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {GRAMMAR_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGrammar(opt.id)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    grammar === opt.id
                      ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/5 text-[var(--foreground)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-muted-foreground hover:border-[var(--text-tertiary)]',
                  )}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Mutation count */}
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mutations
            </label>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={mutationCount}
              onChange={e => setMutationCount(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-mono tabular-nums text-[var(--foreground)] w-12 text-right">
              {mutationCount}
            </span>
          </div>

          {/* Launch button */}
          <Button
            onClick={handleRun}
            disabled={status === 'running'}
            variant="gradient"
            className="gap-2"
          >
            {status === 'running' ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Fuzzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                Start Fuzz Session
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {status === 'done' && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fuzz Results</CardTitle>
            <CardDescription>
              {results.length} mutations tested. {anomalyCount} anomalies detected, {cleanCount} clean.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-center">
                <Zap className="h-5 w-5 mx-auto text-[var(--dojo-primary)] mb-1" aria-hidden="true" />
                <p className="text-lg font-bold tabular-nums">{results.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-[var(--severity-high)] mb-1" aria-hidden="true" />
                <p className="text-lg font-bold tabular-nums text-[var(--severity-high)]">{anomalyCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Anomalies</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-center">
                <CheckCircle className="h-5 w-5 mx-auto text-[var(--status-allow)] mb-1" aria-hidden="true" />
                <p className="text-lg font-bold tabular-nums text-[var(--status-allow)]">{cleanCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Clean</p>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.slice(0, 50).map(r => (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-2 text-xs',
                    r.isAnomaly
                      ? 'border-[var(--severity-high)]/20 bg-[var(--severity-high)]/5'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]',
                  )}
                >
                  {r.isAnomaly ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--severity-high)]" aria-hidden="true" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[var(--status-allow)]" aria-hidden="true" />
                  )}
                  <span className="flex-1 truncate font-mono text-[var(--foreground)]">
                    {r.input.slice(0, 80)}{r.input.length > 80 ? '...' : ''}
                  </span>
                  {r.anomalyType && (
                    <Badge variant="outline" className="text-[10px]">{r.anomalyType}</Badge>
                  )}
                  <span className="tabular-nums text-muted-foreground">{(r.score * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {status === 'idle' && results.length === 0 && (
        <EmptyState
          icon={Shuffle}
          title="No fuzz results yet"
          description="Configure a grammar and mutation count above, then click Start to generate and test mutated inputs against the detection stack."
        />
      )}
    </div>
  )
}
