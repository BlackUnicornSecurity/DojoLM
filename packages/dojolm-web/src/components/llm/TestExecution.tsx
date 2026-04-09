/**
 * File: TestExecution.tsx
 * Purpose: Test execution interface with real-time SSE progress
 * Index:
 * - H7.4 Test Category constants (line 24)
 * - TestExecution component (line 104)
 * - ModelProgressCard component (line 889)
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useModelContext, useExecutionContext } from '@/lib/contexts';
import type { LLMModelConfig, LLMPromptTestCase, LLMBatchExecution } from '@/lib/llm-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Square, RefreshCw, AlertCircle, Database, Clock, Wifi, WifiOff, Timer, BarChart3, Filter } from 'lucide-react';
import {
  AUTHENTICATED_EVENT_STREAM_CLOSED,
  connectAuthenticatedEventStream,
  type AuthenticatedEventStream,
} from '@/lib/authenticated-event-stream';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

// ===========================================================================
// H7.4: Test Case Categorization
// ===========================================================================

const TEST_CATEGORIES = [
  { id: 'all', label: 'All Tests' },
  { id: 'security', label: 'Security' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'performance', label: 'Performance' },
  { id: 'custom', label: 'Custom' },
] as const;

type TestCategoryId = typeof TEST_CATEGORIES[number]['id'];

/** Map compliance framework IDs to OWASP/standard identifiers for pre-population */
const FRAMEWORK_TEST_MAP: Record<string, string[]> = {
  'owasp-llm': ['LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05', 'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10'],
  'nist-ai-rmf': ['NIST-VALID', 'NIST-BIAS', 'NIST-EXPLAIN', 'NIST-PRIV', 'NIST-SEC', 'NIST-SAFE', 'NIST-ACCOUNT', 'NIST-ROBUST'],
  'mitre-atlas': ['AML.T0000', 'AML.T0010', 'AML.T0020', 'AML.T0030', 'AML.T0040', 'AML.T0050', 'AML.T0060', 'AML.T0070'],
};

/** Categories that map to the "security" super-category */
const SECURITY_CATEGORIES = new Set([
  'prompt_injection', 'jailbreak', 'indirect_injection', 'data_exfiltration',
  'harmful_content', 'content_policy', 'tool_abuse', 'social',
]);

/** Categories that map to the "performance" super-category */
const PERFORMANCE_CATEGORIES = new Set(['dos', 'performance', 'token']);

/** Classify a test case into a super-category */
function classifyTestCase(test: { category: string; severity: string; owaspCategory?: string; tags?: string[] }): TestCategoryId {
  const cat = test.category.toLowerCase();

  // Custom: explicit tag or category
  if (cat === 'custom' || test.tags?.some(t => t.toLowerCase() === 'custom')) return 'custom';

  // Performance
  if (PERFORMANCE_CATEGORIES.has(cat) || test.tags?.some(t => PERFORMANCE_CATEGORIES.has(t.toLowerCase()))) return 'performance';

  // Security: matching categories or CRITICAL severity (checked before compliance
  // so that security-focused tests with OWASP mapping stay in security)
  if (SECURITY_CATEGORIES.has(cat) || test.severity === 'CRITICAL') return 'security';

  // Compliance: has OWASP mapping or compliance-related tags
  if (test.owaspCategory || test.tags?.some(t =>
    t.toLowerCase().includes('compliance') ||
    t.toLowerCase().includes('owasp') ||
    t.toLowerCase().includes('nist') ||
    t.toLowerCase().includes('mitre')
  )) return 'compliance';

  // Default to security for unmatched categories (most LLM tests are security-focused)
  return 'security';
}

/** Estimate execution time (Story 6.1) — inlined to avoid Node.js import chain */
function estimateExecutionTime(modelCount: number, testCount: number) {
  const totalExecutions = modelCount * testCount;
  const avgMs = 3000; // Default ~3s per test
  const concurrency = 5;
  const totalMs = (totalExecutions / concurrency) * avgMs;
  const estimateMinutes = Math.max(1, Math.ceil(totalMs / 60000));
  return { estimateMinutes, totalExecutions };
}

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
export function TestExecution({ onNavigateToResults }: { onNavigateToResults?: () => void }) {
  const { models, getEnabledModels } = useModelContext();
  const {
    executeTest, executeBatch, getBatch, cancelBatch, state, refreshState,
    activeBatchId, reconnectingBatchId, setActiveBatch, clearActiveBatch,
  } = useExecutionContext();

  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<LLMBatchExecution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<LLMPromptTestCase[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);

  // H7.4: Category filter state
  const [activeCategory, setActiveCategory] = useState<TestCategoryId>('all');
  const [activeFramework, setActiveFramework] = useState<string | null>(null);

  // SSE-specific state
  const [perModelProgress, setPerModelProgress] = useState<Record<string, PerModelProgress>>({});
  const [sseConnected, setSseConnected] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const eventSourceRef = useRef<AuthenticatedEventStream | null>(null);
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
        const response = await fetchWithAuth('/api/llm/test-cases');
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

  // H7.4/H8.3: Read compliance framework from Bushido Book cross-module link.
  //
  // Train 2 PR-4b.8 (2026-04-09): migrated key from 'llm-compliance-framework'
  // → 'jutsu-compliance-framework' (llm NavId retired). We read the new key
  // first, fall back to the old key for in-flight sessions, and delete both
  // after consumption so this one-shot bridge stays clean.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const framework =
        localStorage.getItem('jutsu-compliance-framework') ??
        localStorage.getItem('llm-compliance-framework');
      if (framework && Object.hasOwn(FRAMEWORK_TEST_MAP, framework)) {
        setActiveCategory('compliance');
        setActiveFramework(framework);
        localStorage.removeItem('jutsu-compliance-framework');
        localStorage.removeItem('llm-compliance-framework');
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  // H7.4: Framework auto-selection — pre-populate test cases when framework changes
  useEffect(() => {
    if (!activeFramework || testCases.length === 0) return;
    const frameworkIds = FRAMEWORK_TEST_MAP[activeFramework];
    if (!frameworkIds) return;

    const matchingIds = new Set<string>();
    for (const test of testCases) {
      if (test.owaspCategory && frameworkIds.includes(test.owaspCategory)) {
        matchingIds.add(test.id);
      }
      if (test.tags?.some(t => frameworkIds.some(fid => t.includes(fid)))) {
        matchingIds.add(test.id);
      }
    }
    if (matchingIds.size > 0) {
      setSelectedTests(prev => {
        const merged = new Set(prev);
        for (const id of matchingIds) merged.add(id);
        return merged;
      });
    }
  }, [activeFramework, testCases]);

  // H7.4: Memoized filtered test cases based on active category
  const filteredTestCases = useMemo(() => {
    if (activeCategory === 'all') return testCases;
    return testCases.filter(test => classifyTestCase(test) === activeCategory);
  }, [testCases, activeCategory]);

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
            // H1.5: Clear persisted batch on terminal state
            clearActiveBatch();
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
    }, 5000); // BUG-002: 5s interval avoids 429 rate limit during long batch runs
  }, [refreshState, getBatch, clearActiveBatch]);

  // Connect SSE for batch progress
  const connectSSE = useCallback((batchId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = connectAuthenticatedEventStream(`/api/llm/batch/${encodeURIComponent(batchId)}/stream`);
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
        // H1.5: Clear persisted batch on completion
        clearActiveBatch();
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
      if (es.readyState === AUTHENTICATED_EVENT_STREAM_CLOSED) {
        // Connection closed normally by server, do not start fallback
        return;
      }
      es.close();
      eventSourceRef.current = null;
      startPollingFallback(batchId);
    });
  }, [startPollingFallback, clearActiveBatch]);

  // H1.5: Reconnect to in-progress batch on mount
  useEffect(() => {
    if (!reconnectingBatchId) return;

    let cancelled = false;

    (async () => {
      setIsReconnecting(true);
      try {
        const batch = await getBatch(reconnectingBatchId);
        if (cancelled) return;

        if (batch && (batch.status === 'running' || batch.status === 'pending')) {
          setCurrentBatch(batch);
          setIsRunning(true);
          isRunningRef.current = true;
          startTimeRef.current = Date.now();

          // Start elapsed timer
          timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }, 1000);

          // Connect SSE for real-time progress
          connectSSE(reconnectingBatchId);
        } else {
          // Batch finished or missing — clear
          clearActiveBatch();
        }
      } catch {
        if (!cancelled) clearActiveBatch();
      } finally {
        if (!cancelled) setIsReconnecting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [reconnectingBatchId, getBatch, clearActiveBatch, connectSSE]);

  const enabledModels = models.filter(m => selectedModels.has(m.id) && m.enabled);

  // Seed test cases if none exist
  const handleSeedTestCases = async () => {
    try {
      const response = await fetchWithAuth('/api/llm/seed', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        if (result.seeded > 0) {
          const testResponse = await fetchWithAuth('/api/llm/test-cases');
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
        // H1.5: Persist batch ID for reconnection
        setActiveBatch(batch.id);
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
    // H1.5: Clear persisted batch on cancel
    clearActiveBatch();
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
    setSelectedTests(prev => {
      const merged = new Set(prev);
      for (const t of filteredTestCases) merged.add(t.id);
      return merged;
    });
  };

  const clearAllTests = () => {
    if (activeCategory === 'all') {
      setSelectedTests(new Set());
    } else {
      const filteredIds = new Set(filteredTestCases.map(t => t.id));
      setSelectedTests(prev => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    }
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
      {/* H1.5: Reconnection banner */}
      {isReconnecting && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 text-sm" data-testid="reconnection-banner">
          <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          <span>Reconnecting to test in progress...</span>
        </div>
      )}

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

      <div className="grid lg:grid-cols-2 gap-3">
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
                  {activeCategory !== 'all' && ` (showing ${filteredTestCases.length} ${activeCategory})`}
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
            {/* H7.4: Category filter pills */}
            <div className="flex flex-wrap gap-1.5 pt-2" role="radiogroup" aria-label="Test category filter" data-testid="category-filters">
              {TEST_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={activeCategory === cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    if (cat.id !== 'compliance') setActiveFramework(null);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] ${
                    activeCategory === cat.id
                      ? 'bg-[var(--bu-electric)] text-white'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                  data-testid={`category-pill-${cat.id}`}
                >
                  {cat.id === 'all' && <Filter className="h-3 w-3" aria-hidden="true" />}
                  {cat.label}
                </button>
              ))}
            </div>
            {/* H7.4: Framework selector for compliance category */}
            {activeCategory === 'compliance' && (
              <div className="pt-2" data-testid="framework-selector">
                <label htmlFor="framework-select" className="text-xs text-muted-foreground block mb-1">
                  Pre-populate from framework:
                </label>
                <select
                  id="framework-select"
                  value={activeFramework ?? ''}
                  onChange={(e) => setActiveFramework(e.target.value || null)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
                  data-testid="framework-dropdown"
                >
                  <option value="">Select framework...</option>
                  <option value="owasp-llm">OWASP LLM Top 10</option>
                  <option value="nist-ai-rmf">NIST AI RMF</option>
                  <option value="mitre-atlas">MITRE ATLAS</option>
                </select>
              </div>
            )}
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
              ) : filteredTestCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <Filter className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground text-center">
                    No tests match the &quot;{activeCategory}&quot; category
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => setActiveCategory('all')}>
                    Show all tests
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                {filteredTestCases.map(test => (
                  <div key={test.id} className="p-3 rounded border space-y-1">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`test-${test.id}`}
                        checked={selectedTests.has(test.id)}
                        onCheckedChange={() => toggleTest(test.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        {currentBatch?.status === 'completed' && onNavigateToResults ? (
                          <button
                            type="button"
                            onClick={onNavigateToResults}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToResults(); } }}
                            aria-label={`View results for ${test.name}`}
                            className="text-sm font-medium cursor-pointer block text-left text-[var(--bu-electric)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] rounded"
                            data-testid={`test-case-link-${test.id}`}
                          >
                            {test.name}
                          </button>
                        ) : (
                          <label
                            htmlFor={`test-${test.id}`}
                            className="text-sm font-medium cursor-pointer block"
                          >
                            {test.name}
                          </label>
                        )}
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

      {/* Estimated execution time (Story 6.1) */}
      {enabledModels.length > 0 && selectedTests.size > 0 && (() => {
        const estimate = estimateExecutionTime(enabledModels.length, selectedTests.size);
        return (
          <div className="flex items-center gap-2 p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm">
            <Timer className="h-4 w-4 shrink-0 text-[var(--bu-electric)]" aria-hidden="true" />
            <span className="text-muted-foreground">
              Estimated: ~{estimate.estimateMinutes} min ({estimate.totalExecutions} executions)
            </span>
          </div>
        );
      })()}

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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
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
            {onNavigateToResults && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={onNavigateToResults}
                  aria-label="View test results"
                  className="gap-2 cursor-pointer"
                  data-testid="view-results-btn"
                >
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  View Results
                </Button>
              </div>
            )}
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
