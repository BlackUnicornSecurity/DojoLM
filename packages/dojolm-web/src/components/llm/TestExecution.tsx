/**
 * File: TestExecution.tsx
 * Purpose: Test execution interface with real-time SSE progress
 * Index:
 * - TestExecution component (line 30)
 * - ModelProgressCard component (line 250)
 * - BatchProgressPanel component (line 210)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useModelContext, useExecutionContext } from '@/lib/contexts';
import type { LLMModelConfig, LLMPromptTestCase, LLMBatchExecution } from '@/lib/llm-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Square, RefreshCw, AlertCircle, Database, Clock, Wifi, WifiOff } from 'lucide-react';

interface PerModelProgress {
  completed: number;
  total: number;
  percent: number;
  lastScore?: number;
}

/**
 * Test Execution Component
 *
 * Interface for selecting models, test cases, and running tests.
 * Uses SSE for real-time progress with polling fallback.
 */
export function TestExecution() {
  const { models, getEnabledModels } = useModelContext();
  const { executeTest, executeBatch, getBatch, cancelBatch, state, refreshState } = useExecutionContext();

  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<LLMBatchExecution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<LLMPromptTestCase[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);

  // SSE-specific state
  const [perModelProgress, setPerModelProgress] = useState<Record<string, PerModelProgress>>({});
  const [sseConnected, setSseConnected] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  // Load enabled models on mount
  useEffect(() => {
    const enabled = getEnabledModels();
    setSelectedModels(new Set(enabled.map(m => m.id)));
  }, [models, getEnabledModels]);

  // Load test cases from API
  useEffect(() => {
    const loadTestCases = async () => {
      setIsLoadingTests(true);
      try {
        const response = await fetch('/api/llm/test-cases');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setTestCases(data);
          }
        }
      } catch (err) {
        console.error('Failed to load test cases:', err);
      } finally {
        setIsLoadingTests(false);
      }
    };

    loadTestCases();
  }, []);

  // Cleanup SSE, timer, and fallback on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (fallbackPollRef.current) {
        clearInterval(fallbackPollRef.current);
        fallbackPollRef.current = null;
      }
    };
  }, []);

  // Polling fallback when SSE fails
  const startPollingFallback = useCallback((batchId: string) => {
    // Clear any existing fallback poll
    if (fallbackPollRef.current) clearInterval(fallbackPollRef.current);

    fallbackPollRef.current = setInterval(async () => {
      try {
        await refreshState();
        const batch = await getBatch(batchId);
        if (batch) {
          setCurrentBatch(batch);
          if (batch.status === 'completed' || batch.status === 'failed' || batch.status === 'cancelled') {
            setIsRunning(false);
            isRunningRef.current = false;
            if (fallbackPollRef.current) {
              clearInterval(fallbackPollRef.current);
              fallbackPollRef.current = null;
            }
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
        }
      } catch {
        // Continue polling
      }
    }, 2000);
  }, [refreshState, getBatch]);

  // Connect SSE for batch progress
  const connectSSE = useCallback((batchId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(`/api/llm/batch/${encodeURIComponent(batchId)}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setSseConnected(true);
    });

    es.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        setCurrentBatch(prev => prev ? {
          ...prev,
          completedTests: data.completedTests,
          totalTests: data.totalTests,
          failedTests: data.failedTests,
          avgResilienceScore: data.avgResilienceScore,
          status: data.status,
        } : prev);
        if (data.perModelProgress) {
          setPerModelProgress(data.perModelProgress);
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('model_complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        setPerModelProgress(prev => ({
          ...prev,
          [data.modelId]: {
            completed: data.completed,
            total: data.total,
            percent: 100,
            lastScore: data.avgScore,
          },
        }));
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('batch_complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        setCurrentBatch(prev => prev ? {
          ...prev,
          completedTests: data.completedTests,
          totalTests: data.totalTests,
          failedTests: data.failedTests,
          avgResilienceScore: data.avgResilienceScore,
          status: data.status,
        } : prev);
        setIsRunning(false);
        isRunningRef.current = false;
        es.close();
        eventSourceRef.current = null;
        setSseConnected(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('error', () => {
      setSseConnected(false);
      // Only fall back if the connection was not closed normally (batch_complete)
      if (es.readyState === EventSource.CLOSED) {
        // Connection closed normally by server, do not start fallback
        return;
      }
      es.close();
      eventSourceRef.current = null;
      startPollingFallback(batchId);
    });
  }, [startPollingFallback]);

  const enabledModels = models.filter(m => selectedModels.has(m.id) && m.enabled);

  // Seed test cases if none exist
  const handleSeedTestCases = async () => {
    try {
      const response = await fetch('/api/llm/seed', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        if (result.seeded > 0) {
          const testResponse = await fetch('/api/llm/test-cases');
          if (testResponse.ok) {
            setTestCases(await testResponse.json());
          }
        }
      }
    } catch (err) {
      console.error('Failed to seed test cases:', err);
    }
  };

  const handleRunTests = async () => {
    // Synchronous guard to prevent double-submission
    if (isRunningRef.current) return;

    if (enabledModels.length === 0) {
      setError('Please select at least one enabled model');
      return;
    }

    if (selectedTests.size === 0) {
      setError('Please select at least one test case');
      return;
    }

    isRunningRef.current = true;
    setIsRunning(true);
    setError(null);
    setPerModelProgress({});
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    // Start elapsed time timer
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    try {
      const selectedTestsList = testCases.filter(t => selectedTests.has(t.id));

      if (enabledModels.length === 1 && selectedTestsList.length === 1) {
        await executeTest(enabledModels[0], selectedTestsList[0]);
        setIsRunning(false);
        isRunningRef.current = false;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        const batch = await executeBatch(
          enabledModels,
          selectedTestsList,
          (updated) => setCurrentBatch(updated)
        );
        setCurrentBatch(batch);
        // Connect SSE for real-time progress
        connectSSE(batch.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test execution failed');
      setIsRunning(false);
      isRunningRef.current = false;
      setElapsedTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleCancel = async () => {
    if (currentBatch) {
      const success = await cancelBatch(currentBatch.id);
      if (!success) {
        setError('Failed to cancel batch. The test may still be running.');
        return;
      }
      setCurrentBatch(null);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setSseConnected(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (fallbackPollRef.current) {
      clearInterval(fallbackPollRef.current);
      fallbackPollRef.current = null;
    }
    setIsRunning(false);
    isRunningRef.current = false;
    setPerModelProgress({});
  };

  const toggleModel = (modelId: string) => {
    const newSet = new Set(selectedModels);
    if (newSet.has(modelId)) {
      newSet.delete(modelId);
    } else {
      newSet.add(modelId);
    }
    setSelectedModels(newSet);
  };

  const toggleTest = (testId: string) => {
    const newSet = new Set(selectedTests);
    if (newSet.has(testId)) {
      newSet.delete(testId);
    } else {
      newSet.add(testId);
    }
    setSelectedTests(newSet);
  };

  const selectAllTests = () => {
    setSelectedTests(new Set(testCases.map(t => t.id)));
  };

  const clearAllTests = () => {
    setSelectedTests(new Set());
  };

  const overallProgress = currentBatch && currentBatch.totalTests > 0
    ? (currentBatch.completedTests / currentBatch.totalTests) * 100
    : 0;

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Active batch progress with per-model cards */}
      {currentBatch && (currentBatch.status === 'running' || currentBatch.status === 'pending') && (
        <div className="space-y-4">
          {/* Overall progress */}
          <Card className="border-[var(--bu-electric)]/20 bg-[var(--bu-electric-subtle)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">Running Batch Test</CardTitle>
                  <Badge variant="outline" className="gap-1">
                    {sseConnected ? (
                      <><Wifi className="h-3 w-3 text-green-500" /> Live</>
                    ) : (
                      <><WifiOff className="h-3 w-3 text-yellow-500" /> Polling</>
                    )}
                  </Badge>
                </div>
                <Badge variant="outline" className="motion-safe:animate-pulse">
                  {currentBatch.completedTests} / {currentBatch.totalTests}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={overallProgress} className="h-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>{Math.round(overallProgress)}% complete</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatElapsed(elapsedTime)}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <Square className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Per-model progress cards */}
          {Object.keys(perModelProgress).length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(perModelProgress).map(([modelId, progress]) => {
                const model = models.find(m => m.id === modelId);
                return (
                  <ModelProgressCard
                    key={modelId}
                    modelName={model?.name ?? modelId}
                    progress={progress}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Models</CardTitle>
            <CardDescription>
              {enabledModels.length} model{enabledModels.length !== 1 ? 's' : ''} selected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {models.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No models configured</p>
                ) : (
                  models.map(model => (
                    <div key={model.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id={`model-${model.id}`}
                        checked={selectedModels.has(model.id)}
                        onCheckedChange={() => toggleModel(model.id)}
                        disabled={!model.enabled}
                      />
                      <label
                        htmlFor={`model-${model.id}`}
                        className={`flex-1 text-sm cursor-pointer ${!model.enabled ? 'text-muted-foreground' : ''}`}
                      >
                        {model.name}
                      </label>
                      {!model.enabled && (
                        <Badge variant="secondary" className="text-xs">Disabled</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Test Case Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Select Test Cases</CardTitle>
                <CardDescription>
                  {selectedTests.size} test{selectedTests.size !== 1 ? 's' : ''} selected
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={selectAllTests}>
                  All
                </Button>
                <Button size="sm" variant="ghost" onClick={clearAllTests}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {isLoadingTests ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : testCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Database className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    No test cases available
                  </p>
                  <Button size="sm" onClick={handleSeedTestCases} variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Load Sample Test Cases
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                {testCases.map(test => (
                  <div key={test.id} className="p-3 rounded border space-y-1">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`test-${test.id}`}
                        checked={selectedTests.has(test.id)}
                        onCheckedChange={() => toggleTest(test.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`test-${test.id}`}
                          className="text-sm font-medium cursor-pointer block"
                        >
                          {test.name}
                        </label>
                        <p className="text-xs text-muted-foreground truncate">
                          {test.prompt}
                        </p>
                      </div>
                      <Badge
                        variant={test.severity === 'CRITICAL' ? 'destructive' : 'outline'}
                        className="text-xs shrink-0"
                      >
                        {test.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Run button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleRunTests}
          disabled={isRunning || enabledModels.length === 0 || selectedTests.size === 0}
          className="gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Tests ({enabledModels.length} × {selectedTests.size} = {enabledModels.length * selectedTests.size} executions)
            </>
          )}
        </Button>
      </div>

      {/* Results summary */}
      {currentBatch && currentBatch.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Batch Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{currentBatch.completedTests}</p>
                <p className="text-sm text-muted-foreground">Tests Run</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{currentBatch.failedTests}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {currentBatch.avgResilienceScore ? Math.round(currentBatch.avgResilienceScore) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Per-model progress card during batch execution
 */
function ModelProgressCard({
  modelName,
  progress,
}: {
  modelName: string;
  progress: PerModelProgress;
}) {
  const isComplete = progress.percent >= 100;

  return (
    <Card className={isComplete ? 'border-green-500/20 bg-green-500/5' : ''}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold truncate">{modelName}</p>
          <Badge
            variant={isComplete ? 'default' : 'outline'}
            className="text-xs shrink-0"
          >
            {progress.completed}/{progress.total}
          </Badge>
        </div>
        <Progress value={progress.percent} className="h-1.5" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.percent}%</span>
          {progress.lastScore !== undefined && (
            <span>Last score: {progress.lastScore}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
