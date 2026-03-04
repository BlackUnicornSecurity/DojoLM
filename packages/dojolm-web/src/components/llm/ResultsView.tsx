/**
 * File: ResultsView.tsx
 * Purpose: View and analyze test results
 * Index:
 * - ResultsView component (line 26)
 * - ExecutionCard component (line 110)
 */

'use client';

import { useState, useEffect } from 'react';
import { useResultsContext, useModelContext } from '@/lib/contexts';
import type { LLMTestExecution, LLMModelConfig, ResultsFilter } from '@/lib/llm-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Filter, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

// LLM resilience score thresholds
const SCORE_HIGH = 80
const SCORE_MODERATE = 50

/**
 * Results View Component
 *
 * Display filtered test results with detailed execution information
 */
export function ResultsView() {
  const { models } = useModelContext();
  const { getExecutions, isLoading, error, filter, setFilter, clearFilter } = useResultsContext();

  const [executions, setExecutions] = useState<LLMTestExecution[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [filter, selectedModel]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const filterOptions: ResultsFilter = {};

      if (selectedModel !== 'all') {
        filterOptions.modelIds = [selectedModel];
      }

      const results = await getExecutions(filterOptions);
      setExecutions(results.slice(0, 50)); // Limit to 50 for display
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (id: string) => {
    const newSet = new Set(expandedCards);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedCards(newSet);
  };

  const handleExport = async () => {
    // TODO: Wire to export API when backend integration is available
  };

  const handleFilterChange = (key: keyof ResultsFilter, value: any) => {
    setFilter({ [key]: value });
  };

  const getScoreColor = (score: number) => {
    if (score >= SCORE_HIGH) return 'text-green-500';
    if (score >= SCORE_MODERATE) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= SCORE_HIGH) return 'default';
    if (score >= SCORE_MODERATE) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
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

        <Button variant="outline" onClick={clearFilter} className="gap-2">
          <Filter className="h-4 w-4" />
          Clear Filters
        </Button>

        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="p-4">
            <p className="text-red-500 text-sm">{error}</p>
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
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Run some tests to see results here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {executions.length} most recent results
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
                getScoreColor={getScoreColor}
                getScoreBadgeVariant={getScoreBadgeVariant}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Individual execution card component
 */
interface ExecutionCardProps {
  execution: LLMTestExecution;
  model?: LLMModelConfig;
  isExpanded: boolean;
  onToggle: () => void;
  getScoreColor: (score: number) => string;
  getScoreBadgeVariant: (score: number) => 'default' | 'secondary' | 'destructive' | 'outline';
}

function ExecutionCard({
  execution,
  model,
  isExpanded,
  onToggle,
  getScoreColor,
  getScoreBadgeVariant
}: ExecutionCardProps) {
  return (
    <Card className={isExpanded ? 'border-primary/20' : ''}>
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base truncate">
                {model?.name || execution.modelConfigId}
              </CardTitle>
              <Badge variant={getScoreBadgeVariant(execution.resilienceScore)}>
                {execution.resilienceScore}/100
              </Badge>
              <Badge variant="outline" className="text-xs">
                {execution.status}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {new Date(execution.timestamp).toLocaleString()} • {execution.duration_ms}ms
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
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
                <Badge key={cat} variant="outline" className="gap-1 text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {cat}
                </Badge>
              ))}
              {execution.categoriesFailed.map(cat => (
                <Badge key={cat} variant="outline" className="gap-1 text-red-600 border-red-600">
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
