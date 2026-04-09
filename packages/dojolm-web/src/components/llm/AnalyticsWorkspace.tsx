/**
 * File: AnalyticsWorkspace.tsx
 * Purpose: Analytics workspace surface — benchmark, transfer matrix, cross-module reporting,
 *          and batch export. Extracted from LLMDashboard.tsx in PR-4b.6 so Bushido Book's
 *          Insights tab can mount it alongside the Leaderboard without depending on the
 *          full LLMDashboard shell.
 * Depends on: LLMExecutionProvider (via useExecutionContext)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { ConsolidatedReportButton } from '@/components/reports/ConsolidatedReportButton';
import { BenchmarkPanel } from './BenchmarkPanel';
import { TransferMatrixPanel } from './TransferMatrixPanel';
import { TestExporter } from './TestExporter';
import { useExecutionContext } from '@/lib/contexts';
import type { LLMBatchExecution, LLMTestExecution } from '@/lib/llm-types';

/**
 * AnalyticsWorkspace — stateless container that reads the active batch id from
 * LLMExecutionProvider, fetches the batch + executions, and renders:
 * - Benchmark panel + Transfer matrix (side by side)
 * - Consolidated cross-module reporting card
 * - Per-batch export panel (when a batch is active)
 *
 * Requires LLMExecutionProvider above it in the tree. Does NOT require
 * LLMModelProvider or LLMResultsProvider.
 */
export function AnalyticsWorkspace() {
  const { activeBatchId, getBatch, getBatchExecutions } = useExecutionContext();
  const [batch, setBatch] = useState<LLMBatchExecution | null>(null);
  const [executions, setExecutions] = useState<LLMTestExecution[]>([]);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!activeBatchId) {
      setBatch(null);
      setExecutions([]);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingBatch(true);

    void Promise.all([
      getBatch(activeBatchId),
      getBatchExecutions(activeBatchId),
    ]).then(([nextBatch, nextExecutions]) => {
      if (cancelled) return;
      setBatch(nextBatch);
      setExecutions(nextExecutions);
    }).catch(() => {
      if (cancelled) return;
      setBatch(null);
      setExecutions([]);
    }).finally(() => {
      if (!cancelled) {
        setIsLoadingBatch(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeBatchId, getBatch, getBatchExecutions]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <BenchmarkPanel />
        <TransferMatrixPanel />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" aria-hidden="true" />
              Cross-Module Reporting
            </CardTitle>
            <CardDescription>
              Generate an executive report that combines LLM, compliance, guard, evidence, and Shingan data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Use the consolidated report when you need a broader platform narrative than the standard batch export.
            </p>
            <ConsolidatedReportButton />
          </CardContent>
        </Card>

        {batch ? (
          <TestExporter batch={batch} executions={executions} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batch Export</CardTitle>
              <CardDescription>
                Export the currently active LLM test batch in JSON, PDF, or Markdown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isLoadingBatch
                  ? 'Loading the active batch export surface...'
                  : 'Run or reconnect to a batch from the Tests tab to unlock the richer export panel.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
