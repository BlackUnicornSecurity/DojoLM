/**
 * File: Scoreboard.tsx
 * Purpose: Scoreboard dashboard tab — model leaderboard, test stats, coverage summary
 * Story: S108 (Scoreboard Dashboard Page)
 * Index:
 * - Scoreboard component (line 15)
 * - ModelScoreCard (line 65)
 * - StatsGrid (line 100)
 */

'use client'

import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Shield, Target, AlertTriangle, Loader2 } from 'lucide-react'

interface ScoreEntry {
  modelConfigId: string
  modelName: string
  provider: string
  avgResilienceScore: number
  testCount: number
  injectionSuccessRate: number
}

interface SummaryStats {
  totalModels: number
  totalExecutions: number
  avgScore: number
  topProvider: string
}

export function Scoreboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithAuth('/api/llm/summary')
        if (res.ok) {
          const data = await res.json()
          const entries: ScoreEntry[] = (data.models || []).map((m: Record<string, unknown>) => ({
            modelConfigId: m.id || m.modelConfigId || '',
            modelName: m.name || m.modelName || 'Unknown',
            provider: m.provider || 'unknown',
            avgResilienceScore: typeof m.avgResilienceScore === 'number' ? m.avgResilienceScore : 0,
            testCount: typeof m.testCount === 'number' ? m.testCount : 0,
            injectionSuccessRate: typeof m.injectionSuccessRate === 'number' ? m.injectionSuccessRate : 0,
          }))

          entries.sort((a, b) => b.avgResilienceScore - a.avgResilienceScore)
          setScores(entries)

          if (entries.length > 0) {
            const totalExec = entries.reduce((s, e) => s + e.testCount, 0)
            const avgS = entries.reduce((s, e) => s + e.avgResilienceScore, 0) / entries.length
            setStats({
              totalModels: entries.length,
              totalExecutions: totalExec,
              avgScore: Math.round(avgS * 10) / 10,
              topProvider: entries[0].provider,
            })
          }
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Scoreboard Dashboard
      </h3>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard icon={Shield} label="Models Tested" value={stats.totalModels} />
          <StatCard icon={Target} label="Total Executions" value={stats.totalExecutions} />
          <StatCard icon={Trophy} label="Avg Resilience" value={`${stats.avgScore}%`} />
          <StatCard icon={AlertTriangle} label="Top Provider" value={stats.topProvider} />
        </div>
      )}

      {error ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-destructive">
            Failed to load scoreboard data. Check your connection and try again.
          </CardContent>
        </Card>
      ) : scores.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No test results yet. Run LLM security tests to populate the scoreboard.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {scores.map((entry, idx) => (
            <Card key={entry.modelConfigId}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{entry.modelName}</p>
                    <p className="text-xs text-muted-foreground">{entry.provider} &middot; {entry.testCount} tests</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{Math.round(entry.avgResilienceScore)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {(entry.injectionSuccessRate * 100).toFixed(1)}% injection rate
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Shield; label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
