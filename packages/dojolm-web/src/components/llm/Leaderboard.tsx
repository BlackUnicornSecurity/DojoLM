/**
 * File: Leaderboard.tsx
 * Purpose: Model comparison leaderboard
 * Index:
 * - Leaderboard component (line 24)
 * - LeaderboardRow component (line 110)
 */

'use client';

import { useState, useEffect } from 'react';
import { useLeaderboard as useLeaderboardHook, useModelContext } from '@/lib/contexts';
import type { LLMModelConfig } from '@/lib/llm-types';
import { PROVIDER_INFO } from '@/lib/llm-constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, RefreshCw } from 'lucide-react';

/**
 * Model Leaderboard Component
 *
 * Displays models ranked by their resilience scores
 */
export function Leaderboard() {
  const { models } = useModelContext();
  const { leaderboard, isLoading } = useLeaderboardHook();
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'provider'>('score');

  const sortedLeaderboard = leaderboard
    ? [...leaderboard].sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score;
        if (sortBy === 'name') return a.modelName.localeCompare(b.modelName);
        return 0;
      })
    : [];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm text-muted-foreground">#{rank}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 50) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

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
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No leaderboard data</h3>
            <p className="text-sm text-muted-foreground">
              Run tests on models to populate the leaderboard
            </p>
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
                    rank={entry.rank}
                    modelName={entry.modelName}
                    score={entry.score}
                    provider={providerInfo?.name || 'Unknown'}
                    isEnabled={model?.enabled ?? false}
                    getRankIcon={getRankIcon}
                    getScoreColor={getScoreColor}
                    getScoreBgColor={getScoreBgColor}
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
              <p className="text-2xl font-bold text-green-500">
                {sortedLeaderboard.filter(e => e.score >= 80).length}
              </p>
              <p className="text-xs text-muted-foreground">Strong (80+)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {sortedLeaderboard.filter(e => e.score >= 50 && e.score < 80).length}
              </p>
              <p className="text-xs text-muted-foreground">Moderate (50-79)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-500">
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
 * Leaderboard row component
 */
interface LeaderboardRowProps {
  rank: number;
  modelName: string;
  score: number;
  provider: string;
  isEnabled: boolean;
  getRankIcon: (rank: number) => React.ReactNode;
  getScoreColor: (score: number) => string;
  getScoreBgColor: (score: number) => string;
}

function LeaderboardRow({
  rank,
  modelName,
  score,
  provider,
  isEnabled,
  getRankIcon,
  getScoreColor,
  getScoreBgColor
}: LeaderboardRowProps) {
  return (
    <div className={`flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors ${!isEnabled ? 'opacity-50' : ''}`}>
      {/* Rank */}
      <div className="w-12 flex justify-center">
        {getRankIcon(rank)}
      </div>

      {/* Model info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{modelName}</p>
        <p className="text-xs text-muted-foreground">{provider}</p>
      </div>

      {/* Score bar */}
      <div className="w-32 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className={getScoreColor(score)}>Score</span>
          <span className={`font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
        <Progress value={score} className="h-2" />
      </div>

      {/* Status badge */}
      <div>
        <Badge variant={score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'destructive'}>
          {score >= 80 ? 'Strong' : score >= 50 ? 'Moderate' : 'Weak'}
        </Badge>
      </div>
    </div>
  );
}

/**
 * Hook to get leaderboard data
 */
function useLeaderboard() {
  const { leaderboard, isLoading } = useLeaderboardHook();
  return { leaderboard, isLoading };
}
