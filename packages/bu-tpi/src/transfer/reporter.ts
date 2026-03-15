/**
 * H25.3: Transfer Matrix Reporter
 * Generates reports in Markdown, JSON, and CSV formats.
 */

import type { TransferMatrix, TransferReport, TransferSummary } from './types.js';

const METHODOLOGY =
  'Cross-model transfer testing: each fixture is run against all models, ' +
  'and the transfer rate measures how often a vulnerability detected in a source model ' +
  'is also detected in a target model. Diagonal is always 1.0 (self-transfer).';

/**
 * Generate a full TransferReport from a matrix and model version info.
 */
export function generateTransferReport(
  matrix: TransferMatrix,
  modelVersions: Record<string, string>,
  summary: TransferSummary,
): TransferReport {
  return {
    matrix,
    generatedAt: new Date().toISOString(),
    methodology: METHODOLOGY,
    modelVersions,
    summary,
  };
}

/**
 * Format a TransferReport as a Markdown document.
 */
export function formatReportMarkdown(report: TransferReport): string {
  const { matrix, summary, generatedAt, methodology, modelVersions } = report;
  const { modelIds } = matrix;
  const lines: string[] = [];

  // Header
  lines.push('# Transfer Matrix Report');
  lines.push('');
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push(methodology);
  lines.push('');

  // Model versions
  lines.push('## Model Versions');
  lines.push('');
  for (const modelId of modelIds) {
    lines.push(`- **${modelId}**: ${modelVersions[modelId] ?? 'unknown'}`);
  }
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Models:** ${summary.totalModels}`);
  lines.push(`- **Total Fixtures:** ${summary.totalFixtures}`);
  lines.push(
    `- **Average Transfer Rate:** ${(summary.averageTransferRate * 100).toFixed(1)}%`,
  );
  lines.push(
    `- **Highest Transfer Pair:** ${summary.highestPair.source} -> ${summary.highestPair.target} (${(summary.highestPair.rate * 100).toFixed(1)}%)`,
  );
  lines.push(
    `- **Lowest Transfer Pair:** ${summary.lowestPair.source} -> ${summary.lowestPair.target} (${(summary.lowestPair.rate * 100).toFixed(1)}%)`,
  );
  lines.push('');

  // NxN Table
  lines.push('## Transfer Matrix');
  lines.push('');

  // Header row
  const headerRow = `| Source \\ Target | ${modelIds.join(' | ')} |`;
  const separator = `| --- | ${modelIds.map(() => '---').join(' | ')} |`;
  lines.push(headerRow);
  lines.push(separator);

  // Data rows
  for (let i = 0; i < modelIds.length; i++) {
    const cells = matrix.matrix[i].map((rate) => `${(rate * 100).toFixed(1)}%`);
    lines.push(`| **${modelIds[i]}** | ${cells.join(' | ')} |`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format a TransferReport as a JSON string.
 */
export function formatReportJSON(report: TransferReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Format the NxN matrix as CSV with model ID headers.
 */
export function formatReportCSV(report: TransferReport): string {
  const { modelIds, matrix: grid } = report.matrix;
  const lines: string[] = [];

  // Header: empty cell + model IDs
  lines.push(['Source\\Target', ...modelIds].join(','));

  // Data rows
  for (let i = 0; i < modelIds.length; i++) {
    const cells = grid[i].map((rate) => rate.toFixed(4));
    lines.push([modelIds[i], ...cells].join(','));
  }

  return lines.join('\n');
}
