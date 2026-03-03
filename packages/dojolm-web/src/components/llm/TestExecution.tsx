/**
 * File: TestExecution.tsx
 * Purpose: Test execution interface for running single and batch tests
 * Index:
 * - TestExecution component (line 27)
 * - ModelSelector component (line 88)
 * - TestCaseSelector component (line 150)
 * - BatchProgress component (line 210)
 */

'use client';

import { useState, useEffect } from 'react';
import { useModelContext, useExecutionContext } from '@/lib/contexts';
import type { LLMModelConfig, LLMPromptTestCase, LLMBatchExecution } from '@/lib/llm-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Square, RefreshCw, AlertCircle, Database } from 'lucide-react';

/**
 * Test Execution Component
 *
 * Interface for selecting models, test cases, and running tests
 */
export function TestExecution() {
  const { models, getEnabledModels } = useModelContext();
  const { executeTest, executeBatch, getBatch, state, refreshState } = useExecutionContext();

  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<LLMBatchExecution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<LLMPromptTestCase[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);

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
          setTestCases(data);
        }
      } catch (err) {
        console.error('Failed to load test cases:', err);
      } finally {
        setIsLoadingTests(false);
      }
    };

    loadTestCases();
  }, []);

  // Refresh batch state if running
  useEffect(() => {
    if (state.activeBatches.length > 0) {
      const interval = setInterval(async () => {
        await refreshState();
        // Update current batch
        for (const batchId of state.activeBatches) {
          const batch = await getBatch(batchId);
          if (batch && (batch.status === 'running' || batch.status === 'pending')) {
            setCurrentBatch(batch);
          }
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [state.activeBatches, refreshState, getBatch]);

  const enabledModels = models.filter(m => selectedModels.has(m.id) && m.enabled);

  // Seed test cases if none exist
  const handleSeedTestCases = async () => {
    try {
      const response = await fetch('/api/llm/seed', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        if (result.seeded > 0) {
          // Reload test cases
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
    if (enabledModels.length === 0) {
      setError('Please select at least one enabled model');
      return;
    }

    if (selectedTests.size === 0) {
      setError('Please select at least one test case');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const selectedTestsList = testCases.filter(t => selectedTests.has(t.id));

      // Single model, single test - run directly
      if (enabledModels.length === 1 && selectedTestsList.length === 1) {
        await executeTest(enabledModels[0], selectedTestsList[0]);
      } else {
        // Batch execution
        const batch = await executeBatch(
          enabledModels,
          selectedTestsList,
          (updated) => setCurrentBatch(updated)
        );
        setCurrentBatch(batch);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    if (currentBatch) {
      await executionContext.cancelBatch(currentBatch.id);
      setCurrentBatch(null);
    }
    setIsRunning(false);
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

  const progress = currentBatch
    ? (currentBatch.completedTests / currentBatch.totalTests) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Active batch progress */}
      {currentBatch && currentBatch.status === 'running' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Running Batch Test</CardTitle>
              <Badge variant="outline" className="animate-pulse">
                {currentBatch.completedTests} / {currentBatch.totalTests}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{Math.round(progress)}% complete</span>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <Square className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
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
              <RefreshCw className="h-4 w-4 animate-spin" />
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
