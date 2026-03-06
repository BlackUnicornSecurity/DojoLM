/**
 * File: Leaderboard.tsx
 * Purpose: Model comparison leaderboard with sparklines, trends, and re-test
 * Index:
 * - Leaderboard component (line 30)
 * - LeaderboardRow component (line 180)
 * - TrendSparkline component (line 280)
 */

'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useLeaderboard as useLeaderboardHook, useModelContext } from '@/lib/contexts';
import type { LLMModelConfig } from '@/lib/llm-types';
import { PROVIDER_INFO } from '@/lib/llm-constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, RefreshCw, TrendingUp, TrendingDown, Minus, Play } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { EmptyState } from '@/components/ui/EmptyState';
import { getBeltRank } from '@/components/ui/BeltBadge';

interface ScoreHistoryEntry {
  timestamp: string;
  score: number;
}

interface LeaderboardEntryWithHistory {
  modelId: string;
  modelName: string;
  rank: number;
  score: number;
  scoreHistory: ScoreHistoryEntry[];
  scoreChange: number;
  testCount: number;
}

// Pure utility functions - moved outside component for stability
function getRankIcon(rank: number): ReactNode {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-[var(--rank-gold)]" />;
    case 2:
      return <Medal className="h-5 w-5 text-[var(--rank-silver)]" />;
    case 3:
      return <Medal className="h-5 w-5 text-[var(--rank-bronze)]" />;
    default:
      return <span className="text-sm text-muted-foreground">#{rank}</span>;
  }
}

// LLM resilience score thresholds
const SCORE_HIGH = 80
const SCORE_MODERATE = 50

function getScoreColor(score: number): string {
  if (score >= SCORE_HIGH) return 'text-[var(--status-allow)]';
  if (score >= SCORE_MODERATE) return 'text-[var(--severity-medium)]';
  return 'text-[var(--status-block)]';
}

function getScoreBgColor(score: number): string {
  if (score >= SCORE_HIGH) return 'bg-[var(--status-allow-bg)]';
  if (score >= SCORE_MODERATE) return 'bg-[var(--severity-medium-bg)]';
  return 'bg-[var(--status-block-bg)]';
}

function isValidHistoryEntry(e: unknown): e is ScoreHistoryEntry {
  return (
    e !== null &&
    typeof e === 'object' &&
    typeof (e as ScoreHistoryEntry).score === 'number' &&
    typeof (e as ScoreHistoryEntry).timestamp === 'string'
  );
}

/**
 * Model Leaderboard Component
 *
 * Displays models ranked by resilience scores with:
 * - Trend sparklines (last 5 runs)
 * - Score change indicators
 * - Re-test action
 */
export function Leaderboard() {
  const { models } = useModelContext();
  const { leaderboard, isLoading } = useLeaderboardHook();
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');
  const [historyData, setHistoryData] = useState<Record<string, ScoreHistoryEntry[]>>({});
  const [retesting, setRetesting] = useState<Set<string>>(new Set());
  const retestingRef = useRef<Set<string>>(new Set());

  // Load score history from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('dojolm-score-history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          // Validate per-entry schema
          const validated: Record<string, ScoreHistoryEntry[]> = {};
          for (const [key, val] of Object.entries(parsed)) {
            if (Array.isArray(val) && val.every(isValidHistoryEntry)) {
              validated[key] = val;
            }
          }
          setHistoryData(validated);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Update score history when leaderboard changes - using functional updater to avoid stale closure
  useEffect(() => {
    if (!leaderboard || leaderboard.length === 0) return;

    setHistoryData(prev => {
      const updated = { ...prev };
      let changed = false;

      for (const entry of leaderboard) {
        if (!updated[entry.modelId]) {
          updated[entry.modelId] = [];
        }

        const history = updated[entry.modelId];
        const lastEntry = history[history.length - 1];

        // Only add if score changed or no history
        if (!lastEntry || lastEntry.score !== entry.score) {
          history.push({
            timestamp: new Date().toISOString(),
            score: entry.score,
          });

          // Keep only last 10 entries
          if (history.length > 10) {
            updated[entry.modelId] = history.slice(-10);
          }

          changed = true;
        }
      }

      if (changed) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('dojolm-score-history', JSON.stringify(updated));
        }
        return updated;
      }
      return prev; // referential stability — no re-render
    });
  }, [leaderboard]);

  const entriesWithHistory: LeaderboardEntryWithHistory[] = leaderboard
    ? leaderboard.map(entry => {
        const history = historyData[entry.modelId] ?? [];
        const prevScore = history.length >= 2 ? history[history.length - 2].score : entry.score;
        return {
          ...entry,
          scoreHistory: history.slice(-5),
          scoreChange: entry.score - prevScore,
          testCount: history.length,
        };
      })
    : [];

  const sortedLeaderboard = [...entriesWithHistory].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'name') return a.modelName.localeCompare(b.modelName);
    return 0;
  });

  const handleRetest = useCallback(async (modelId: string) => {
    // Synchronous guard using ref
    if (retestingRef.current.has(modelId)) return;

    const confirmed = globalThis.confirm('Re-test this model with the same test cases?');
    if (!confirmed) return;

    retestingRef.current.add(modelId);
    setRetesting(prev => new Set([...prev, modelId]));

    try {
      // Get latest batch for this model to re-use test cases
      const batchResponse = await fetchWithAuth('/api/llm/batch');
      if (!batchResponse.ok) throw new Error(`Failed to fetch batches: ${batchResponse.status}`);

      const { batches } = await batchResponse.json();
      const modelBatch = batches?.find(
        (b: { modelConfigIds: string[]; status: string }) =>
          b.modelConfigIds.includes(modelId) && b.status === 'completed'
      );

      if (!modelBatch) {
        throw new Error('No previous test batch found for this model');
      }

      // Create new batch with same test cases
      const response = await fetchWithAuth('/api/llm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelIds: [modelId],
          testCaseIds: modelBatch.testCaseIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start re-test');
      }
    } catch (err) {
      console.error('Re-test failed:', err);
    } finally {
      retestingRef.current.delete(modelId);
      setRetesting(prev => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Model Leaderboard</h3>
          <p className="text-sm text-muted-foreground">
            {sortedLeaderboard.length} models ranked by resilience score
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'score' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('score')}
          >
            By Score
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('name')}
          >
            By Name
          </Button>
        </div>
      </div>

      {/* Leaderboard */}
      {sortedLeaderboard.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <EmptyState icon={Trophy} title="No leaderboard data" description="Run tests to populate the leaderboard" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {sortedLeaderboard.map((entry) => {
                const model = models.find(m => m.id === entry.modelId);
                const providerInfo = model ? PROVIDER_INFO[model.provider] : null;

                return (
                  <LeaderboardRow
                    key={entry.modelId}
                    entry={entry}
                    provider={providerInfo?.name || 'Unknown'}
                    isEnabled={model?.enabled ?? false}
                    isRetesting={retesting.has(entry.modelId)}
                    onRetest={() => handleRetest(entry.modelId)}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats summary */}
      {sortedLeaderboard.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[var(--status-allow)]">
                {sortedLeaderboard.filter(e => e.score >= 80).length}
              </p>
              <p className="text-xs text-muted-foreground">Strong (80+)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[var(--severity-medium)]">
                {sortedLeaderboard.filter(e => e.score >= 50 && e.score < 80).length}
              </p>
              <p className="text-xs text-muted-foreground">Moderate (50-79)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[var(--status-block)]">
                {sortedLeaderboard.filter(e => e.score < 50).length}
              </p>
              <p className="text-xs text-muted-foreground">Weak (&lt;50)</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced leaderboard row with sparkline and actions
 */
interface LeaderboardRowProps {
  entry: LeaderboardEntryWithHistory;
  provider: string;
  isEnabled: boolean;
  isRetesting: boolean;
  onRetest: () => void;
}

function LeaderboardRow({
  entry,
  provider,
  isEnabled,
  isRetesting,
  onRetest,
}: LeaderboardRowProps) {
  const belt = getBeltRank(entry.score);

  const getChangeIndicator = (change: number) => {
    const rounded = Number.isFinite(change) ? Number(change.toFixed(1)) : 0;
    if (rounded > 0) return <span className="flex items-center gap-0.5 text-[var(--status-allow)] text-xs"><TrendingUp className="h-3 w-3" />+{rounded}</span>;
    if (rounded < 0) return <span className="flex items-center gap-0.5 text-[var(--status-block)] text-xs"><TrendingDown className="h-3 w-3" />{rounded}</span>;
    return <span className="flex items-center gap-0.5 text-muted-foreground text-xs"><Minus className="h-3 w-3" />0</span>;
  };

  return (
    <div className={`flex items-center gap-4 p-4 hover:border-[var(--dojo-primary)]/30 transition-colors ${!isEnabled ? 'opacity-50' : ''}`}>
      {/* Rank */}
      <div className="w-12 flex justify-center">
        {getRankIcon(entry.rank)}
      </div>

      {/* Belt rank bar */}
      <div
        className="w-1 h-5 rounded-full flex-shrink-0"
        style={{ backgroundColor: belt.color }}
        aria-label={belt.label}
        title={belt.label}
      />

      {/* Model info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold truncate">{entry.modelName}</p>
          <span className="text-xs opacity-50 flex-shrink-0" aria-hidden="true" style={{ color: belt.color }}>
            {belt.short}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{provider}</p>
      </div>

      {/* Sparkline */}
      {entry.scoreHistory.length >= 2 && (
        <div className="hidden md:block">
          <TrendSparkline
            data={entry.scoreHistory.map(h => h.score)}
            width={64}
            height={20}
          />
        </div>
      )}

      {/* Score change */}
      <div className="w-16 text-center">
        {getChangeIndicator(entry.scoreChange)}
      </div>

      {/* Score bar */}
      <div className="w-32 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className={getScoreColor(entry.score)}>Score</span>
          <span className={`font-bold ${getScoreColor(entry.score)}`}>{entry.score}</span>
        </div>
        <Progress value={entry.score} className="h-2" />
      </div>

      {/* Status badge */}
      <div>
        <Badge variant={entry.score >= 80 ? 'default' : entry.score >= 50 ? 'secondary' : 'destructive'}>
          {entry.score >= 80 ? 'Strong' : entry.score >= 50 ? 'Moderate' : 'Weak'}
        </Badge>
      </div>

      {/* Re-test button */}
      <div className="hidden lg:block">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetest}
          disabled={isRetesting || !isEnabled}
          className="h-8 px-2 gap-1"
          title="Re-test this model"
        >
          {isRetesting ? (
            <RefreshCw className="h-3 w-3 motion-safe:animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          <span className="text-xs">Re-test</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * SVG-based mini sparkline chart
 */
function TrendSparkline({
  data,
  width = 64,
  height = 20,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pointCoords = data.map((value, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((value - min) / range) * (height - 4) - 2,
  }));

  const points = pointCoords.map(p => `${p.x},${p.y}`);

  const isUptrend = data[data.length - 1] >= data[0];
  const strokeColor = isUptrend ? 'var(--status-allow)' : 'var(--status-block)';
  const lastPoint = pointCoords[pointCoords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      role="img"
      aria-label={`Trend: ${data.join(', ')}`}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}
