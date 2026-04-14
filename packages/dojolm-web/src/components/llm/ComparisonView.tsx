'use client';

/**
 * ComparisonView — Side-by-side provider compliance comparison (P8-S87)
 *
 * Heatmap of compliance by category × provider using recharts.
 * Clear distinction between Scanner Detection Rate and LLM Compliance Rate.
 */

import React, { useState, useMemo } from 'react';
import { useResultsContext } from '@/lib/contexts';
import { useModelContext } from '@/lib/contexts';
import { computeTransferScores } from 'bu-tpi/behavioral-metrics';
import { TransferMatrix } from './TransferMatrix';

interface ComparisonData {
  modelId: string;
  modelName: string;
  provider: string;
  categories: Record<string, { passRate: number; count: number }>;
  overallScore: number;
}

export function ComparisonView() {
  const { getModelReport } = useResultsContext();
  const { models } = useModelContext();
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferScores, setTransferScores] = useState<ReturnType<typeof computeTransferScores>>([]);

  const enabledModels = useMemo(
    () => models.filter(m => m.enabled),
    [models]
  );

  const handleCompare = async () => {
    if (selectedModels.length < 2) return;
    setLoading(true);
    try {
      const data: ComparisonData[] = [];
      // Cache reports to avoid fetching each model twice
      const reportCache = new Map<string, Awaited<ReturnType<typeof getModelReport>>>();
      for (const modelId of selectedModels) {
        const report = await getModelReport(modelId);
        if (!report) continue;
        reportCache.set(modelId, report);
        const categories: Record<string, { passRate: number; count: number }> = {};
        for (const cat of report.byCategory) {
          categories[cat.category] = { passRate: cat.passRate, count: cat.count };
        }
        data.push({
          modelId,
          modelName: report.modelName,
          provider: report.provider,
          categories,
          overallScore: report.avgResilienceScore,
        });
      }
      setComparisonData(data);

      // Compute transfer scores from cached report data (no second fetch)
      const reports: { modelConfigId: string; byCategory: { category: string; passRate: number }[] }[] = [];
      for (const modelId of selectedModels) {
        const report = reportCache.get(modelId);
        if (report) {
          reports.push({ modelConfigId: report.modelConfigId, byCategory: report.byCategory });
        }
      }
      setTransferScores(computeTransferScores(reports));
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = (id: string) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // Get all unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const d of comparisonData) {
      for (const cat of Object.keys(d.categories)) cats.add(cat);
    }
    return [...cats].sort();
  }, [comparisonData]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-[var(--status-allow)]/10 text-[var(--status-allow)]';
    if (score >= 50) return 'bg-[var(--severity-medium)]/10 text-[var(--severity-medium)]';
    return 'bg-[var(--status-block)]/10 text-[var(--status-block)]';
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <h3 className="text-sm font-semibold mb-3">Select Models to Compare</h3>
        <p className="text-xs text-muted-foreground mb-2">
          Note: This compares <strong>LLM Compliance Rate</strong> (how well the model resists attacks),
          which is distinct from <strong>Scanner Detection Rate</strong> (how well our scanner detects attacks in text).
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {enabledModels.map(m => (
            <button
              key={m.id}
              onClick={() => toggleModel(m.id)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedModels.includes(m.id)
                  ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                  : 'border-[var(--border-primary)] hover:border-[var(--dojo-primary)]'
              }`}
              aria-pressed={selectedModels.includes(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
        <button
          onClick={handleCompare}
          disabled={selectedModels.length < 2 || loading}
          className="px-4 py-2 text-xs rounded bg-[var(--dojo-primary)] text-white disabled:opacity-50"
          aria-label="Compare selected models"
        >
          {loading ? 'Loading...' : `Compare ${selectedModels.length} Models`}
        </button>
      </div>

      {comparisonData.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" role="table" aria-label="Model compliance comparison">
            <thead>
              <tr>
                <th className="p-2 text-left border-b border-[var(--border-primary)]">Category</th>
                {comparisonData.map(d => (
                  <th key={d.modelId} className="p-2 text-center border-b border-[var(--border-primary)]">
                    {d.modelName}
                    <div className="text-xs text-muted-foreground font-normal">{d.provider}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="font-semibold">
                <td className="p-2 border-b border-[var(--border-primary)]">Overall Compliance</td>
                {comparisonData.map(d => (
                  <td key={d.modelId} className="p-2 text-center border-b border-[var(--border-primary)]">
                    <span className={`px-2 py-1 rounded ${getScoreColor(d.overallScore)}`}>
                      {d.overallScore}%
                    </span>
                  </td>
                ))}
              </tr>
              {allCategories.map(cat => (
                <tr key={cat}>
                  <td className="p-2 border-b border-[var(--border-primary)] whitespace-nowrap">{cat}</td>
                  {comparisonData.map(d => {
                    const entry = d.categories[cat];
                    const rate = entry ? Math.round(entry.passRate * 100) : 0;
                    return (
                      <td key={d.modelId} className="p-2 text-center border-b border-[var(--border-primary)]">
                        <span className={`px-2 py-0.5 rounded text-xs ${getScoreColor(rate)}`}>
                          {entry ? `${rate}%` : '—'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {transferScores.length > 0 && (
        <div className="p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <TransferMatrix
            scores={transferScores}
            modelNames={Object.fromEntries(comparisonData.map(d => [d.modelId, d.modelName]))}
          />
        </div>
      )}

      {comparisonData.length === 0 && selectedModels.length >= 2 && !loading && (
        <p className="text-xs text-muted-foreground text-center py-8">
          Click &quot;Compare&quot; to see results side-by-side.
        </p>
      )}
    </div>
  );
}
