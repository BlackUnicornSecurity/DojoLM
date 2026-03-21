'use client';

import type { QualityMetrics, StatisticalComparison } from '@/lib/llm-quality-types';

interface QualityMetricsCardProps {
  readonly metrics?: QualityMetrics;
  readonly comparison?: StatisticalComparison;
  readonly className?: string;
}

function getColorClass(score: number): string {
  if (score >= 0.7) return 'bg-green-500';
  if (score >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getTextColorClass(score: number): string {
  if (score >= 0.7) return 'text-green-400';
  if (score >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}

function GaugeBar({ label, score }: { readonly label: string; readonly score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={getTextColorClass(score)}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${getColorClass(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function QualityMetricsCard({
  metrics,
  comparison,
  className = '',
}: QualityMetricsCardProps) {
  if (!metrics && !comparison) return null;

  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Quality Metrics
      </h3>

      {metrics && (
        <div className="space-y-3">
          <GaugeBar label="Coherence" score={metrics.coherenceScore} />
          <GaugeBar label="Relevance" score={metrics.relevanceScore} />
          <GaugeBar label="Consistency" score={metrics.consistencyScore} />

          <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Verbosity:</span>{' '}
              {metrics.verbosityRatio.toFixed(1)}x
            </div>
            <div>
              <span className="font-medium">Latency:</span>{' '}
              {metrics.responseLatencyMs}ms
            </div>
            <div>
              <span className="font-medium">Tokens:</span>{' '}
              {metrics.tokenCount}
            </div>
          </div>
        </div>
      )}

      {comparison && (
        <div className="mt-4 border-t pt-3">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
            Model Comparison
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-1 text-left font-medium">Metric</th>
                <th className="pb-1 text-right font-medium">Delta</th>
                <th className="pb-1 text-right font-medium">Sig.</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(comparison.metricDeltas).map(([key, delta]) => (
                <tr key={key} className="border-b border-muted/50">
                  <td className="py-1 capitalize">
                    {key.replace('Score', '')}
                  </td>
                  <td className={`py-1 text-right ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                  </td>
                  <td className="py-1 text-right">
                    {comparison.significanceLevel < 0.05 ? (
                      <span className="text-green-400">*</span>
                    ) : (
                      <span className="text-muted-foreground">ns</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {comparison.winner && (
            <p className="mt-2 text-xs text-muted-foreground">
              Winner: <span className="font-semibold text-foreground">{comparison.winner}</span>
              {' '}(p={comparison.significanceLevel.toFixed(3)}, n={comparison.sampleSize})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
