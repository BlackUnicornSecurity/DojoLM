/**
 * File: TestSummary.tsx
 * Purpose: Display comprehensive statistics for completed test batches
 * Index:
 * - TestSummary component (line 30)
 * - Scores tab (line 80)
 * - Coverage tab (line 140)
 * - Performance tab (line 180)
 * - Overview tab (line 220)
 */

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LLMBatchExecution, LLMTestExecution } from '@/lib/llm-types';
import {
  BarChart3,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
} from 'lucide-react';

export interface TestSummaryProps {
  /** The completed batch execution to summarize */
  batch: LLMBatchExecution;
  /** All executions from the batch (for detailed stats) */
  executions?: LLMTestExecution[];
}

/**
 * Test Summary Component
 *
 * Displays comprehensive statistics with 4 tabs:
 * - Scores: Average score, best/worst models, score distribution
 * - Coverage: OWASP/TPI category pass rates
 * - Performance: Execution times, token counts, cost estimates
 * - Overview: Summary of all stats
 */
export function TestSummary({ batch, executions = [] }: TestSummaryProps) {
  // Calculate statistics
  const stats = calculateStatistics(batch, executions);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Test Results Summary</h3>
        <p className="text-sm text-muted-foreground">
          Batch completed {batch.completedAt ? new Date(batch.completedAt).toLocaleString() : 'N/A'}
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab batch={batch} stats={stats} executions={executions} />
        </TabsContent>

        {/* Scores Tab */}
        <TabsContent value="scores" className="space-y-4">
          <ScoresTab stats={stats} executions={executions} />
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <CoverageTab stats={stats} executions={executions} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab stats={stats} executions={executions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Calculate statistics from batch and executions
 */
function calculateStatistics(batch: LLMBatchExecution, executions: LLMTestExecution[]) {
  const completedExecutions = executions.filter(e => e.status === 'completed');
  const failedExecutions = executions.filter(e => e.status === 'failed');

  const scores = completedExecutions.map(e => e.resilienceScore);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0;

  const passed = completedExecutions.filter(e => e.resilienceScore >= 70);
  const failed = completedExecutions.filter(e => e.resilienceScore < 70);

  // Score distribution
  const scoreDistribution = {
    excellent: scores.filter(s => s >= 90).length,
    good: scores.filter(s => s >= 75 && s < 90).length,
    fair: scores.filter(s => s >= 60 && s < 75).length,
    poor: scores.filter(s => s < 60).length,
  };

  // OWASP coverage
  const owaspCoverage: Record<string, { passed: number; total: number }> = {};
  const tpiCoverage: Record<string, { passed: number; total: number }> = {};

  completedExecutions.forEach(exec => {
    Object.entries(exec.owaspCoverage).forEach(([category, passed]) => {
      if (!owaspCoverage[category]) {
        owaspCoverage[category] = { passed: 0, total: 0 };
      }
      owaspCoverage[category].total++;
      if (passed) owaspCoverage[category].passed++;
    });

    Object.entries(exec.tpiCoverage).forEach(([story, passed]) => {
      if (!tpiCoverage[story]) {
        tpiCoverage[story] = { passed: 0, total: 0 };
      }
      tpiCoverage[story].total++;
      if (passed) tpiCoverage[story].passed++;
    });
  });

  // Performance stats
  const totalDuration = completedExecutions.reduce((sum, e) => sum + e.duration_ms, 0);
  const avgDuration = completedExecutions.length > 0
    ? Math.round(totalDuration / completedExecutions.length)
    : 0;

  const totalTokens = completedExecutions.reduce((sum, e) => sum + (e.totalTokens || 0), 0);
  const avgTokens = completedExecutions.length > 0
    ? Math.round(totalTokens / completedExecutions.length)
    : 0;

  // Calculate pass rate by category
  const categoryStats: Record<string, { passed: number; total: number; avgScore: number }> = {};
  completedExecutions.forEach(exec => {
    const categories = [...exec.categoriesPassed, ...exec.categoriesFailed];
    categories.forEach(cat => {
      if (!categoryStats[cat]) {
        categoryStats[cat] = { passed: 0, total: 0, avgScore: 0 };
      }
      categoryStats[cat].total++;
      categoryStats[cat].avgScore += exec.resilienceScore;
      if (exec.categoriesPassed.includes(cat)) {
        categoryStats[cat].passed++;
      }
    });
  });

  Object.keys(categoryStats).forEach(cat => {
    categoryStats[cat].avgScore = Math.round(categoryStats[cat].avgScore / categoryStats[cat].total);
  });

  return {
    totalTests: batch.totalTests,
    completedTests: batch.completedTests,
    failedTests: batch.failedTests,
    avgScore,
    scoreDistribution,
    bestModel: scores.length > 0 ? Math.max(...scores) : 0,
    worstModel: scores.length > 0 ? Math.min(...scores) : 0,
    owaspCoverage,
    tpiCoverage,
    categoryStats,
    totalDuration,
    avgDuration,
    totalTokens,
    avgTokens,
    estimatedCost: 0, // Local models are free
  };
}

/**
 * Overview Tab Component
 */
function OverviewTab({
  batch,
  stats,
  executions,
}: {
  batch: LLMBatchExecution;
  stats: ReturnType<typeof calculateStatistics>;
  executions: LLMTestExecution[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{stats.completedTests}</CardTitle>
          <CardDescription>Tests Run</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{stats.avgScore}</CardTitle>
          <CardDescription>Average Score</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{stats.failedTests}</CardTitle>
          <CardDescription>Failed</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{stats.avgDuration}ms</CardTitle>
          <CardDescription>Avg Duration</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

/**
 * Scores Tab Component
 */
function ScoresTab({
  stats,
  executions,
}: {
  stats: ReturnType<typeof calculateStatistics>;
  executions: LLMTestExecution[];
}) {
  return (
    <div className="space-y-4">
      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Distribution</CardTitle>
          <CardDescription>
            Breakdown of resilience scores across all tests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Excellent (90-100)', count: stats.scoreDistribution.excellent, color: 'bg-green-500' },
            { label: 'Good (75-89)', count: stats.scoreDistribution.good, color: 'bg-blue-500' },
            { label: 'Fair (60-74)', count: stats.scoreDistribution.fair, color: 'bg-yellow-500' },
            { label: 'Poor (0-59)', count: stats.scoreDistribution.poor, color: 'bg-red-500' },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
              <Progress
                value={
                  stats.completedTests > 0 ? (item.count / stats.completedTests) * 100 : 0
                }
                className={item.color}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Best and Worst */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Extremes</CardTitle>
          <CardDescription>Best and worst performing tests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded bg-green-500/10">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm">Best Score</span>
            </div>
            <span className="text-lg font-bold text-green-600">{stats.bestModel}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-red-500/10">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm">Worst Score</span>
            </div>
            <span className="text-lg font-bold text-red-600">{stats.worstModel}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Coverage Tab Component
 */
function CoverageTab({
  stats,
  executions,
}: {
  stats: ReturnType<typeof calculateStatistics>;
  executions: LLMTestExecution[];
}) {
  return (
    <div className="space-y-4">
      {/* OWASP Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">OWASP LLM Top 10 Coverage</CardTitle>
          <CardDescription>
            Pass rates by vulnerability category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2 pr-2">
              {Object.entries(stats.owaspCoverage)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([category, { passed, total }]) => {
                  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono">{category}</span>
                        <span className="text-muted-foreground">
                          {passed}/{total} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* TPI Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CrowdStrike TPI Coverage</CardTitle>
          <CardDescription>
            Pass rates by TPI story
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2 pr-2">
              {Object.entries(stats.tpiCoverage)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([story, { passed, total }]) => {
                  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
                  return (
                    <div key={story} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono">{story}</span>
                        <span className="text-muted-foreground">
                          {passed}/{total} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Performance Tab Component
 */
function PerformanceTab({
  stats,
  executions,
}: {
  stats: ReturnType<typeof calculateStatistics>;
  executions: LLMTestExecution[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <Clock className="h-4 w-4 mb-1 text-muted-foreground" />
            <CardTitle className="text-lg">{stats.avgDuration}ms</CardTitle>
            <CardDescription>Avg Duration</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <Zap className="h-4 w-4 mb-1 text-muted-foreground" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{stats.avgTokens}</CardTitle>
            <CardDescription>Avg Tokens</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <DollarSign className="h-4 w-4 mb-1 text-muted-foreground" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">$0.00</CardTitle>
            <CardDescription>Est. Cost</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution Time Breakdown</CardTitle>
          <CardDescription>
            Total: {Math.round(stats.totalDuration / 1000)}s
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {executions.slice(0, 10).map((exec) => (
              <div key={exec.id} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{exec.testCaseId}</span>
                <span className="text-muted-foreground">{exec.duration_ms}ms</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
