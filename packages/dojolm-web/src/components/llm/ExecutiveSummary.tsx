/**
 * File: ExecutiveSummary.tsx
 * Purpose: Executive summary view with resilience gauge, risk tier, top vulnerabilities
 * Index:
 * - ExecutiveSummary component (line 25)
 * - ResilienceGauge component (line 150)
 * - VulnerabilityList component (line 200)
 * - ModelComparisonMatrix component (line 250)
 */

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  AlertTriangle, TrendingUp, Lightbulb,
  ChevronDown, ChevronUp,
} from 'lucide-react';

interface ExecutiveSummaryData {
  overallScore: number;
  riskTier: string;
  topVulnerabilities: Array<{
    category: string;
    count: number;
    avgScore: number;
    severity: string;
  }>;
  modelComparison: Array<{
    modelId: string;
    modelName: string;
    avgScore: number;
    testCount: number;
    riskTier: string;
  }>;
  findings: string;
  recommendations: string[];
  totalTests: number;
  generatedAt?: string;
}

function clampScore(score: number): number {
  return Number.isFinite(score) ? Math.round(Math.min(100, Math.max(0, score))) : 0;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

/**
 * Executive Summary Component
 *
 * Displays high-level overview of LLM security testing results:
 * - Overall resilience score (large gauge)
 * - Risk tier classification
 * - Top 5 vulnerabilities
 * - Model comparison matrix
 * - Key findings and recommendations
 */
export function ExecutiveSummary() {
  const [data, setData] = useState<ExecutiveSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/llm/summary', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Failed to load summary');
        }
        const result = await response.json();
        // Validate critical array fields
        if (!Array.isArray(result.topVulnerabilities)) result.topVulnerabilities = [];
        if (!Array.isArray(result.recommendations)) result.recommendations = [];
        if (!Array.isArray(result.modelComparison)) result.modelComparison = [];
        setData(result);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load executive summary');
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" aria-hidden="true" />
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalTests === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-lg font-semibold mb-2">No data available</h3>
          <p className="text-sm text-muted-foreground">
            Run tests on models to generate an executive summary
          </p>
        </CardContent>
      </Card>
    );
  }

  const generatedDate = formatDate(data.generatedAt);

  return (
    <div className="space-y-6">
      {/* Top row: Score gauge + Risk tier */}
      <div className="grid md:grid-cols-3 gap-6">
        <ResilienceGauge score={data.overallScore} />

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RiskTierBadge tier={data.riskTier} />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.findings}
            </p>
            <div className="text-xs text-muted-foreground">
              Based on {data.totalTests} test execution{data.totalTests !== 1 ? 's' : ''}
              {generatedDate && ` • Generated ${generatedDate}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerabilities and Model Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        <VulnerabilityList vulnerabilities={data.topVulnerabilities} />

        {data.modelComparison.length > 1 && (
          <ModelComparisonMatrix models={data.modelComparison} />
        )}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" aria-hidden="true" />
              <CardTitle className="text-base">Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Large resilience score gauge
 */
function ResilienceGauge({ score }: { score: number }) {
  const safeScore = clampScore(score);

  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBorderColor = (s: number) => {
    if (s >= 80) return 'border-green-500/30';
    if (s >= 50) return 'border-yellow-500/30';
    return 'border-red-500/30';
  };

  const getIcon = (s: number) => {
    if (s >= 80) return <ShieldCheck className="h-8 w-8 text-green-500" aria-hidden="true" />;
    if (s >= 50) return <ShieldAlert className="h-8 w-8 text-yellow-500" aria-hidden="true" />;
    return <ShieldX className="h-8 w-8 text-red-500" aria-hidden="true" />;
  };

  return (
    <Card className={`${getBorderColor(safeScore)}`}>
      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
        {getIcon(safeScore)}
        <p className={`text-metric-xl mt-2 ${getColor(safeScore)}`}>
          {safeScore}
        </p>
        <p className="text-label mt-1">Overall Resilience</p>
        <Progress value={safeScore} className="h-2 mt-3 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Risk tier display badge
 */
function RiskTierBadge({ tier }: { tier: string }) {
  const config: Record<string, { icon: ReactNode; className: string }> = {
    'Production-Ready': {
      icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
      className: 'bg-green-500/10 text-green-500 border-green-500/20',
    },
    'Needs Hardening': {
      icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
      className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    },
    'Unsafe': {
      icon: <ShieldX className="h-4 w-4" aria-hidden="true" />,
      className: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
  };

  const cfg = config[tier] ?? {
    icon: <Shield className="h-4 w-4" aria-hidden="true" />,
    className: 'bg-muted text-muted-foreground border-muted',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${cfg.className}`}>
      {cfg.icon}
      {tier}
    </div>
  );
}

/**
 * Top vulnerabilities collapsible list
 */
function VulnerabilityList({
  vulnerabilities,
}: {
  vulnerabilities: ExecutiveSummaryData['topVulnerabilities'];
}) {
  const [expanded, setExpanded] = useState(true);

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive' as const;
      case 'HIGH': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" aria-hidden="true" />
            <CardTitle className="text-base">Top Vulnerabilities</CardTitle>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <CardDescription>
          {vulnerabilities.length} categor{vulnerabilities.length !== 1 ? 'ies' : 'y'} identified
        </CardDescription>
      </CardHeader>
      {expanded && (
        <CardContent>
          {vulnerabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No vulnerabilities detected
            </p>
          ) : (
            <div className="space-y-3">
              {vulnerabilities.map((vuln, i) => (
                <div key={vuln.category} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <span className="text-sm text-muted-foreground w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{vuln.category.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {vuln.count} occurrence{vuln.count !== 1 ? 's' : ''} • Avg score: {clampScore(vuln.avgScore)}
                    </p>
                  </div>
                  <Badge variant={getSeverityVariant(vuln.severity)} className="text-xs shrink-0">
                    {vuln.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Model comparison matrix
 */
function ModelComparisonMatrix({
  models,
}: {
  models: ExecutiveSummaryData['modelComparison'];
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[var(--bu-electric)]" aria-hidden="true" />
          <CardTitle className="text-base">Model Comparison</CardTitle>
        </div>
        <CardDescription>
          {models.length} models compared
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <div className="space-y-3">
            {models.map((model, i) => {
              const safeScore = clampScore(model.avgScore);
              return (
                <div key={model.modelId} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <span className="text-sm font-bold w-6">
                    {i === 0 ? '🏆' : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{model.modelName}</p>
                    <p className="text-xs text-muted-foreground">
                      {model.testCount} tests • {model.riskTier}
                    </p>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(safeScore)}`}>
                    {safeScore}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
