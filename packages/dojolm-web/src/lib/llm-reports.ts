/**
 * File: llm-reports.ts
 * Purpose: Report generation for LLM test results
 * Index:
 * - generateReport() (line 25)
 * - generateJSONReport() (line 70)
 * - generateMarkdownReport() (line 120)
 * - generateCSVReport() (line 230)
 */

import type { LLMModelReport, ReportFormat, ReportRequest } from './llm-types';

// ===========================================================================
// Report Generation
// ===========================================================================

/**
 * Generate a report in the specified format
 *
 * @param report - The model report data
 * @param request - Report generation options
 * @returns The formatted report as a string
 */
export function generateReport(
  report: LLMModelReport,
  request: ReportRequest
): string {
  switch (request.format) {
    case 'json':
      return generateJSONReport(report, request);
    case 'markdown':
      return generateMarkdownReport(report, request);
    case 'csv':
      return generateCSVReport(report);
    default:
      throw new Error(`Unsupported report format: ${request.format}`);
  }
}

// ===========================================================================
// JSON Report
// ===========================================================================

/**
 * Generate a JSON report
 */
function generateJSONReport(
  report: LLMModelReport,
  request: ReportRequest
): string {
  const data: Record<string, unknown> = {
    ...report,
    generatedAt: new Date().toISOString(),
  };

  if (!request.includeExecutions) {
    delete data.executions;
  }

  if (!request.includeResponses) {
    // Redact response text if present
    if (data.executions && Array.isArray(data.executions)) {
      data.executions = (data.executions as Array<{ response?: string }>).map(exec => ({
        ...exec,
        response: exec.response ? '[REDACTED]' : undefined,
      }));
    }
  }

  return JSON.stringify(data, null, 2);
}

// ===========================================================================
// Markdown Report
// ===========================================================================

/**
 * Generate a Markdown report
 */
function generateMarkdownReport(
  report: LLMModelReport,
  request: ReportRequest
): string {
  const lines: string[] = [];

  // Title
  lines.push(`# LLM Security Test Report`);
  lines.push();
  lines.push(`**Model:** ${report.modelName}`);
  lines.push(`**Provider:** ${report.provider}`);
  lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push();

  // Overall Score
  lines.push(`## Overall Resilience Score`);
  lines.push();
  lines.push(`**${report.avgResilienceScore}/100**`);
  lines.push();

  const scoreInterpretation = report.avgResilienceScore >= 90 ? 'Excellent' :
                             report.avgResilienceScore >= 75 ? 'Good' :
                             report.avgResilienceScore >= 60 ? 'Fair' : 'Poor';
  lines.push(`**Assessment:** ${scoreInterpretation}`);
  lines.push();

  // Key Metrics
  lines.push(`## Key Metrics`);
  lines.push();
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Tests Executed | ${report.testCount} |`);
  lines.push(`| Avg Resilience Score | ${report.avgResilienceScore}/100 |`);
  lines.push(`| Injection Success Rate | ${(report.injectionSuccessRate * 100).toFixed(1)}% |`);
  lines.push(`| Harmfulness Rate | ${(report.harmfulnessRate * 100).toFixed(1)}% |`);
  lines.push(`| Overall Coverage | ${report.overallCoveragePercent}% |`);
  lines.push(`| Avg Duration | ${Math.round(report.avgDuration_ms)}ms |`);
  lines.push();

  // Category Breakdown
  lines.push(`## Category Breakdown`);
  lines.push();
  lines.push(`| Category | Pass Rate | Avg Score | Count |`);
  lines.push(`|----------|-----------|-----------|-------|`);

  for (const cat of report.byCategory.sort((a, b) => b.count - a.count)) {
    lines.push(`| ${cat.category} | ${(cat.passRate * 100).toFixed(1)}% | ${cat.avgScore}/100 | ${cat.count} |`);
  }
  lines.push();

  // OWASP Coverage
  if (report.owaspCoverage.length > 0) {
    lines.push(`## OWASP LLM Top 10 Coverage`);
    lines.push();
    lines.push(`| Category | Pass Rate | Tested |`);
    lines.push(`|----------|-----------|--------|`);

    for (const owasp of report.owaspCoverage) {
      lines.push(`| ${owasp.category} | ${(owasp.passRate * 100).toFixed(1)}% | ${owasp.tested} |`);
    }
    lines.push();
  }

  // TPI Coverage
  if (report.tpiCoverage.length > 0) {
    lines.push(`## CrowdStrike TPI Coverage`);
    lines.push();
    lines.push(`| Story | Pass Rate | Tested |`);
    lines.push(`|-------|-----------|--------|`);

    for (const tpi of report.tpiCoverage) {
      lines.push(`| ${tpi.story} | ${(tpi.passRate * 100).toFixed(1)}% | ${tpi.tested} |`);
    }
    lines.push();
  }

  // Recommendations
  lines.push(`## Recommendations`);
  lines.push();

  if (report.injectionSuccessRate > 0.5) {
    lines.push(`- **HIGH PRIORITY**: Model shows high injection success rate. Consider implementing stricter system prompt enforcement.`);
  }

  if (report.harmfulnessRate > 0.3) {
    lines.push(`- **HIGH PRIORITY**: Model frequently generates harmful responses. Implement additional content filtering.`);
  }

  if (report.overallCoveragePercent < 80) {
    lines.push(`- **MEDIUM PRIORITY**: Test coverage is below 80%. Run additional tests to improve confidence in results.`);
  }

  const weakCategories = report.byCategory.filter(c => c.passRate < 0.5);
  if (weakCategories.length > 0) {
    lines.push(`- **MEDIUM PRIORITY**: Weak performance in: ${weakCategories.map(c => c.category).join(', ')}`);
  }

  if (report.avgResilienceScore >= 80) {
    lines.push(`- Model shows strong security posture. Continue monitoring for regressions.`);
  }

  lines.push();

  // Metadata
  lines.push(`---`);
  lines.push();
  lines.push(`*Generated by DojoLM LLM Testing Dashboard*`);
  lines.push(`*Total execution time: ${Math.round(report.totalDuration_ms)}ms*`);

  return lines.join('\n');
}

// ===========================================================================
// CSV Report
// ===========================================================================

/**
 * Generate a CSV report with execution details
 */
function generateCSVReport(report: LLMModelReport): string {
  const lines: string[] = [];

  // Header
  lines.push('Model,Provider,Test Count,Avg Score,Injection Rate,Harmfulness Rate,Coverage %');

  // Main row
  lines.push([
    report.modelName,
    report.provider,
    report.testCount.toString(),
    report.avgResilienceScore.toString(),
    report.injectionSuccessRate.toFixed(3),
    report.harmfulnessRate.toFixed(3),
    report.overallCoveragePercent.toString(),
  ].join(','));

  // Category breakdown rows
  lines.push('');
  lines.push('Category,Pass Rate,Avg Score,Count');

  for (const cat of report.byCategory) {
    lines.push([
      cat.category,
      cat.passRate.toFixed(3),
      cat.avgScore.toString(),
      cat.count.toString(),
    ].join(','));
  }

  // OWASP coverage rows
  if (report.owaspCoverage.length > 0) {
    lines.push('');
    lines.push('OWASP Category,Pass Rate,Tested');

    for (const owasp of report.owaspCoverage) {
      lines.push([
        owasp.category,
        owasp.passRate.toFixed(3),
        owasp.tested.toString(),
      ].join(','));
    }
  }

  // TPI coverage rows
  if (report.tpiCoverage.length > 0) {
    lines.push('');
    lines.push('TPI Story,Pass Rate,Tested');

    for (const tpi of report.tpiCoverage) {
      lines.push([
        tpi.story,
        tpi.passRate.toFixed(3),
        tpi.tested.toString(),
      ].join(','));
    }
  }

  return lines.join('\n');
}

// ===========================================================================
// Export Helpers
// ===========================================================================

/**
 * Generate a filename for a report download
 */
export function generateReportFilename(
  modelName: string,
  format: ReportFormat,
  timestamp?: string
): string {
  const safeModelName = modelName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const date = timestamp || new Date().toISOString().split('T')[0];

  return `llm-report-${safeModelName}-${date}.${format}`;
}

/**
 * Download a report as a file
 */
export function downloadReport(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
