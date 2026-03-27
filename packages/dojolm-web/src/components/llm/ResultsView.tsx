/**
 * File: ResultsView.tsx
 * Purpose: Unified Results view — executive summary, model-centric cards with belt system, vulnerability panel
 * Story: NODA-3 Stories 6.2, 6.3, 6.4 + HAKONE H7.2, H7.3
 * Index:
 * - ResultsView component (line 30)
 * - ModelAggregateView (line 80)
 * - ExecutionListView (line 150)
 * - ExecutionCard component (line 190)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useResultsContext, useModelContext } from '@/lib/contexts';
import { formatDate } from '@/lib/utils';
import type { LLMTestExecution, LLMModelConfig, ResultsFilter } from '@/lib/llm-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Filter, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, LayoutGrid, List } from 'lucide-react';
import { BeltBadge } from '@/components/ui/BeltBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModelResultCard, aggregateByModel } from './ModelResultCard';
import { ExecutiveSummary } from './ExecutiveSummary';
import { VulnerabilityPanel } from './VulnerabilityPanel';

// LLM resilience score thresholds
const SCORE_HIGH = 80
const SCORE_MODERATE = 50

/**
 * Results View Component — Stories 6.2, 6.3, 6.4
 *
 * Model-centric aggregate view (default) with per-test list view toggle.
 */
export function ResultsView() {
  const { models } = useModelContext();
  const { getExecutions, isLoading, error, filter, setFilter, clearFilter } = useResultsContext();

  const [executions, setExecutions] = useState<LLMTestExecution[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'models' | 'list'>('models');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'name'>('score');

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const filterOptions: ResultsFilter = {};

      if (selectedModel !== 'all') {
        filterOptions.modelIds = [selectedModel];
      }

      const results = await getExecutions(filterOptions);
      setExecutions(results);
    } catch {
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedModel, getExecutions]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const toggleCard = (id: string) => {
    const newSet = new Set(expandedCards);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedCards(newSet);
  };

  /** Download all results as JSON (Story 6.3) */
  const handleExportAll = useCallback(async () => {
    const data = JSON.stringify(executions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [executions]);

  /** Download single execution as JSON (Story 6.3) */
  const handleDownloadExecution = useCallback((execution: LLMTestExecution) => {
    const data = JSON.stringify(execution, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `result-${execution.modelConfigId}-${execution.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /** Download model results as JSON (Story 6.3) */
  const handleDownloadModel = useCallback((modelId: string) => {
    const modelExecs = executions.filter(e => e.modelConfigId === modelId);
    const data = JSON.stringify(modelExecs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-results-${modelId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [executions]);

  const getScoreColor = (score: number) => {
    if (score >= SCORE_HIGH) return 'text-[var(--status-allow)]';
    if (score >= SCORE_MODERATE) return 'text-[var(--severity-medium)]';
    return 'text-[var(--status-block)]';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= SCORE_HIGH) return 'default';
    if (score >= SCORE_MODERATE) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary — merged from standalone Summary tab (H7.2) */}
      <section data-testid="results-executive-summary" aria-label="Executive Summary">
        <ExecutiveSummary />
      </section>

      {/* Header with filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-64">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {models.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View mode toggle (Story 6.2) */}
        <div className="flex border border-[var(--border)] rounded-lg">
          <Button
            variant={viewMode === 'models' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-2 rounded-r-none"
            onClick={() => setViewMode('models')}
            aria-label="Model view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-2 rounded-l-none"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Sort selector (Story 6.2) */}
        {viewMode === 'models' && (
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'score' | 'date' | 'name')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">By Score</SelectItem>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" onClick={clearFilter} className="gap-2">
          <Filter className="h-4 w-4" />
          Clear
        </Button>

        <Button variant="outline" onClick={handleExportAll} className="gap-2" aria-label="Download all results">
          <Download className="h-4 w-4" />
          Download All
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-[var(--danger)] bg-[var(--danger)]/10">
          <CardContent className="p-4">
            <p className="text-[var(--danger)] text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : executions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <EmptyState icon={AlertTriangle} title="No results found" description="Run some tests to see results here" />
          </CardContent>
        </Card>
      ) : viewMode === 'models' ? (
        <ModelAggregateView
          executions={executions}
          models={models}
          sortBy={sortBy}
          onDownload={handleDownloadModel}
        />
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {executions.length} result{executions.length !== 1 ? 's' : ''}
          </div>

          {executions.map(execution => {
            const isExpanded = expandedCards.has(execution.id);
            const model = models.find(m => m.id === execution.modelConfigId);

            return (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                model={model}
                isExpanded={isExpanded}
                onToggle={() => toggleCard(execution.id)}
                onDownload={() => handleDownloadExecution(execution)}
                getScoreColor={getScoreColor}
                getScoreBadgeVariant={getScoreBadgeVariant}
              />
            );
          })}
        </div>
      )}

      {/* Vulnerability Panel — merged from standalone Vulns tab (H7.2) */}
      <section data-testid="results-vulnerability-panel" aria-label="Vulnerability Findings">
        <VulnerabilityPanel />
      </section>
    </div>
  );
}

/** Model-centric aggregate view (Story 6.2) */
function ModelAggregateView({
  executions,
  models,
  sortBy,
  onDownload,
}: {
  executions: LLMTestExecution[];
  models: LLMModelConfig[];
  sortBy: 'score' | 'date' | 'name';
  onDownload: (modelId: string) => void;
}) {
  let aggregated = aggregateByModel(executions, models);

  // Apply sorting
  if (sortBy === 'date') {
    aggregated = [...aggregated].sort(
      (a, b) => new Date(b.lastTestedAt).getTime() - new Date(a.lastTestedAt).getTime()
    );
  } else if (sortBy === 'name') {
    aggregated = [...aggregated].sort((a, b) => a.modelName.localeCompare(b.modelName));
  }
  // 'score' is default sort from aggregateByModel

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {aggregated.length} model{aggregated.length !== 1 ? 's' : ''} tested
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aggregated.map(result => (
          <ModelResultCard
            key={result.modelId}
            result={result}
            onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual execution card component with download button (Story 6.3)
 */
interface ExecutionCardProps {
  execution: LLMTestExecution;
  model?: LLMModelConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: () => void;
  getScoreColor: (score: number) => string;
  getScoreBadgeVariant: (score: number) => 'default' | 'secondary' | 'destructive' | 'outline';
}

function ExecutionCard({
  execution,
  model,
  isExpanded,
  onToggle,
  onDownload,
  getScoreColor,
  getScoreBadgeVariant
}: ExecutionCardProps) {
  return (
    <Card className={isExpanded ? 'border-primary/20' : ''}>
      <CardHeader
        className="cursor-pointer hover:border-[var(--dojo-primary)]/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base truncate">
                {model?.name || execution.modelConfigId}
              </CardTitle>
              <BeltBadge score={execution.resilienceScore} size="sm" />
              <Badge variant={getScoreBadgeVariant(execution.resilienceScore)}>
                {execution.resilienceScore}/100
              </Badge>
              <Badge variant="outline" className="text-xs">
                {execution.status}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {formatDate(execution.timestamp, true)} • {execution.duration_ms}ms
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {/* Per-test download (Story 6.3) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              aria-label={`Download result for ${model?.name || execution.modelConfigId}`}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Score breakdown */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className={`text-2xl font-bold ${getScoreColor(execution.resilienceScore)}`}>{execution.resilienceScore}</p>
              <p className="text-xs text-muted-foreground">Resilience Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Math.round(execution.injectionSuccess * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">Injection Success</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Math.round(execution.harmfulness * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">Harmfulness</p>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Categories</p>
            <div className="flex flex-wrap gap-2">
              {execution.categoriesPassed.map(cat => (
                <Badge key={cat} variant="outline" className="gap-1 text-[var(--success)] border-[var(--success)]">
                  <CheckCircle2 className="h-3 w-3" />
                  {cat}
                </Badge>
              ))}
              {execution.categoriesFailed.map(cat => (
                <Badge key={cat} variant="outline" className="gap-1 text-[var(--danger)] border-[var(--danger)]">
                  <XCircle className="h-3 w-3" />
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* Response preview */}
          {execution.response && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Response</p>
              <ScrollArea className="h-32 rounded border p-3">
                <p className="text-sm whitespace-pre-wrap">{execution.response}</p>
              </ScrollArea>
            </div>
          )}

          {/* Token usage */}
          {execution.totalTokens && (
            <div className="text-xs text-muted-foreground">
              Tokens: {execution.promptTokens} prompt + {execution.completionTokens} completion = {execution.totalTokens} total
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
