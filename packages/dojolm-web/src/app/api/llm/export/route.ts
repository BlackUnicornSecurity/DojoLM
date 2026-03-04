/**
 * File: api/llm/export/route.ts
 * Purpose: Export test results in various formats
 * Methods:
 * - GET: Export batch results as JSON, PDF, Markdown, CSV, or SARIF
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileStorage } from '@/lib/storage/file-storage';
import type { ReportFormat, LLMTestExecution } from '@/lib/llm-types';

// PDF generation utilities
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SAFE_ID = /^[\w-]{1,128}$/;

/**
 * GET /api/llm/export
 *
 * Query parameters:
 * - batchId: The batch execution ID to export
 * - format: 'json' | 'pdf' | 'md' | 'csv' | 'sarif'
 * - includeResponses: Include full response text (default: true)
 *
 * Returns exported test results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const format = (searchParams.get('format') || 'json') as ReportFormat;
    const includeResponses = searchParams.get('includeResponses') !== 'false';

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    // Validate batchId to prevent path traversal
    if (!SAFE_ID.test(batchId)) {
      return NextResponse.json(
        { error: 'Invalid batch ID format' },
        { status: 400 }
      );
    }

    // Get batch data
    const batch = await fileStorage.getBatch(batchId);
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Get all executions for this batch, filtering out nulls
    const executions = (await Promise.all(
      (batch.executionIds ?? []).map((id) => fileStorage.getExecution(id))
    )).filter((e): e is LLMTestExecution => e !== null);

    // Build model report for export
    const report = buildModelReport(batch, executions, includeResponses);

    // Generate export based on format
    switch (format) {
      case 'json':
        return exportAsJSON(report, includeResponses);

      case 'pdf':
        return exportAsPDF(report, includeResponses);

      case 'markdown':
        return exportAsMarkdown(report, includeResponses);

      case 'csv':
        return exportAsCSV(report);

      case 'sarif':
        return exportAsSARIF(report);

      default:
        return NextResponse.json(
          { error: `Unsupported format: ${format}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}

/**
 * Build a model report from batch and executions
 */
function buildModelReport(
  batch: any,
  executions: any[],
  includeResponses: boolean
) {
  // Group executions by model
  const byModel: Record<string, any[]> = {};
  executions.forEach((exec) => {
    if (!exec || !exec.modelConfigId) return;
    if (!byModel[exec.modelConfigId]) {
      byModel[exec.modelConfigId] = [];
    }
    byModel[exec.modelConfigId].push(exec);
  });

  // Create report for each model
  const modelReports = Object.entries(byModel).map(([modelId, modelExecutions]) => {
    const completed = modelExecutions.filter((e) => e.status === 'completed');
    const totalDuration = completed.reduce((sum, e) => sum + e.duration_ms, 0);
    const avgScore = completed.length > 0
      ? completed.reduce((sum, e) => sum + e.resilienceScore, 0) / completed.length
      : 0;

    // Calculate by category
    const categoryMap: Record<string, { total: number; passed: number; sumScore: number }> = {};
    completed.forEach((exec) => {
      [...(exec.categoriesPassed || []), ...(exec.categoriesFailed || [])].forEach((cat) => {
        if (!categoryMap[cat]) {
          categoryMap[cat] = { total: 0, passed: 0, sumScore: 0 };
        }
        categoryMap[cat].total++;
        categoryMap[cat].sumScore += exec.resilienceScore;
        if ((exec.categoriesPassed || []).includes(cat)) {
          categoryMap[cat].passed++;
        }
      });
    });

    const byCategory = Object.entries(categoryMap).map(([category, stats]) => ({
      category,
      passRate: stats.total > 0 ? stats.passed / stats.total : 0,
      avgScore: stats.total > 0 ? stats.sumScore / stats.total : 0,
      count: stats.total,
    }));

    // OWASP coverage
    const owaspMap: Record<string, { passed: number; total: number }> = {};
    completed.forEach((exec) => {
      Object.entries(exec.owaspCoverage || {}).forEach(([cat, passed]) => {
        if (!owaspMap[cat]) {
          owaspMap[cat] = { passed: 0, total: 0 };
        }
        owaspMap[cat].total++;
        if (passed) owaspMap[cat].passed++;
      });
    });

    const owaspCoverage = Object.entries(owaspMap)
      .filter(([, stats]) => stats.total > 0)
      .map(([category, stats]) => ({
        category,
        passRate: stats.passed / stats.total,
        tested: stats.total,
      }));

    // TPI coverage
    const tpiMap: Record<string, { passed: number; total: number }> = {};
    completed.forEach((exec) => {
      Object.entries(exec.tpiCoverage || {}).forEach(([story, passed]) => {
        if (!tpiMap[story]) {
          tpiMap[story] = { passed: 0, total: 0 };
        }
        tpiMap[story].total++;
        if (passed) tpiMap[story].passed++;
      });
    });

    const tpiCoverage = Object.entries(tpiMap)
      .filter(([, stats]) => stats.total > 0)
      .map(([story, stats]) => ({
        story,
        passRate: stats.passed / stats.total,
        tested: stats.total,
      }));

    // Overall coverage
    const totalOWASPCoverage = Object.values(owaspMap).reduce((sum, stats) => {
      return sum + (stats.passed / stats.total);
    }, 0);
    const overallTPICoverage = Object.values(tpiMap).reduce((sum, stats) => {
      return sum + (stats.passed / stats.total);
    }, 0);
    const totalCategories = owaspCoverage.length + tpiCoverage.length;
    const overallCoveragePercent =
      totalCategories > 0
        ? Math.round(((totalOWASPCoverage + overallTPICoverage) / totalCategories) * 100)
        : 0;

    return {
      modelConfigId: modelId,
      modelName: modelExecutions[0]?.model || modelId,
      provider: modelExecutions[0]?.provider || 'unknown',
      testCount: completed.length,
      avgResilienceScore: Math.round(avgScore),
      injectionSuccessRate: completed.length > 0
        ? completed.filter((e) => e.injectionSuccess > 0.5).length / completed.length
        : 0,
      harmfulnessRate: completed.length > 0
        ? completed.filter((e) => e.harmfulness > 0.3).length / completed.length
        : 0,
      byCategory,
      owaspCoverage,
      tpiCoverage,
      overallCoveragePercent,
      totalDuration_ms: totalDuration,
      avgDuration_ms: Math.round(totalDuration / completed.length) || 0,
      generatedAt: new Date().toISOString(),
      // Include full execution details if requested
      ...(includeResponses && {
        executions: modelExecutions,
      }),
    };
  });

  // Return array of model reports (one per model in the batch)
  return {
    batchId: batch.id,
    batchStartedAt: batch.startedAt,
    batchCompletedAt: batch.completedAt,
    totalTests: batch.totalTests,
    totalExecutions: executions.length,
    models: modelReports,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Export as JSON
 */
function exportAsJSON(report: any, includeResponses: boolean): NextResponse {
  const data = {
    ...report,
    exportedAt: new Date().toISOString(),
    format: 'json',
  };

  // Redact responses if not included - fix: check nested models, not top-level executions
  if (!includeResponses && data.models) {
    data.models = data.models.map((m: any) => ({
      ...m,
      executions: m.executions?.map((exec: { response?: string; prompt?: string }) => ({
        ...exec,
        response: exec.response ? '[REDACTED]' : undefined,
        prompt: exec.prompt ? '[REDACTED]' : undefined,
      })),
    }));
  }

  return NextResponse.json(data);
}

/**
 * Export as PDF
 */
function exportAsPDF(report: any, includeResponses: boolean): NextResponse {
  const doc = new jsPDF();
  let yPosition = 0;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LLM Security Test Report', 14, yPosition);
  yPosition += 10;

  // Metadata
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Model: ${report.modelName}`, 14, yPosition);
  doc.text(`Provider: ${report.provider}`, 14, yPosition + 7);
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 14, yPosition + 14);
  yPosition += 25;

  // Overall Score
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Resilience Score', 14, yPosition);
  yPosition += 7;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${report.avgResilienceScore}/100`, 14, yPosition);
  yPosition += 15;

  // Key Metrics Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Metrics', 14, yPosition);
  yPosition += 7;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Tests Executed', `${report.testCount}`],
      ['Avg Score', `${report.avgResilienceScore}/100`],
      ['Injection Rate', `${(report.injectionSuccessRate * 100).toFixed(1)}%`],
      ['Harmfulness Rate', `${(report.harmfulnessRate * 100).toFixed(1)}%`],
      ['Coverage', `${report.overallCoveragePercent}%`],
      ['Avg Duration', `${report.avgDuration_ms}ms`],
    ],
    theme: 'plain',
    headStyles: { fillColor: [240, 240, 240] },
    margin: { top: 5 },
  });

  yPosition += 40;

  // Category Breakdown Table
  if (report.byCategory.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Breakdown', 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Pass Rate', 'Avg Score', 'Tests']],
      body: report.byCategory.map((cat: any) => [
        cat.category,
        `${(cat.passRate * 100).toFixed(1)}%`,
        `${Math.round(cat.avgScore)}/100`,
        `${cat.count}`,
      ]),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240] },
      margin: { top: 5 },
    });

    yPosition += 40;
  }

  // Page break for coverage
  doc.addPage();

  yPosition = 20;

  // OWASP Coverage Table
  if (report.owaspCoverage.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OWASP LLM Top 10 Coverage', 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Pass Rate', 'Tested']],
      body: report.owaspCoverage.map((owasp: any) => [
        owasp.category,
        `${(owasp.passRate * 100).toFixed(1)}%`,
        `${owasp.tested}`,
      ]),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240] },
      margin: { top: 5 },
    });

    yPosition += 40;
  }

  // TPI Coverage Table
  if (report.tpiCoverage.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CrowdStrike TPI Coverage', 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
      startY: yPosition,
      head: [['Story', 'Pass Rate', 'Tested']],
      body: report.tpiCoverage.map((tpi: any) => [
        tpi.story,
        `${(tpi.passRate * 100).toFixed(1)}%`,
        `${tpi.tested}`,
      ]),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240] },
      margin: { top: 5 },
    });
  }

  // Generate PDF and return as base64
  const pdfBytes = doc.output('arraybuffer');
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  const safeModelName = (report.modelName || 'export').replace(/[^\w-]/g, '_');

  return NextResponse.json({
    format: 'pdf',
    data: pdfBase64,
    filename: `llm-report-${safeModelName}-${new Date().toISOString().split('T')[0]}.pdf`,
  });
}

/**
 * Export as Markdown
 */
function exportAsMarkdown(report: any, includeResponses: boolean): NextResponse {
  const lines: string[] = [];

  // Header
  lines.push('# LLM Security Test Report');
  lines.push();
  lines.push(`**Model:** ${report.modelName}`);
  lines.push(`**Provider:** ${report.provider}`);
  lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push();

  // Overall Score
  lines.push('## Overall Resilience Score');
  lines.push();
  lines.push(`**${report.avgResilienceScore}/100**`);
  lines.push();

  // Key Metrics
  lines.push('## Key Metrics');
  lines.push();
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Tests Executed | ${report.testCount} |`);
  lines.push(`| Avg Resilience Score | ${report.avgResilienceScore}/100 |`);
  lines.push(`| Injection Success Rate | ${(report.injectionSuccessRate * 100).toFixed(1)}% |`);
  lines.push(`| Harmfulness Rate | ${(report.harmfulnessRate * 100).toFixed(1)}% |`);
  lines.push(`| Overall Coverage | ${report.overallCoveragePercent}% |`);
  lines.push(`| Avg Duration | ${report.avgDuration_ms}ms |`);
  lines.push();

  // Category Breakdown
  if (report.byCategory.length > 0) {
    lines.push('## Category Breakdown');
    lines.push();
    lines.push('| Category | Pass Rate | Avg Score | Count |');
    lines.push('|----------|-----------|-----------|-------|');

    report.byCategory.forEach((cat: any) => {
      lines.push(`| ${cat.category} | ${(cat.passRate * 100).toFixed(1)}% | ${Math.round(cat.avgScore)}/100 | ${cat.count} |`);
    });
    lines.push();
  }

  // OWASP Coverage
  if (report.owaspCoverage.length > 0) {
    lines.push('## OWASP LLM Top 10 Coverage');
    lines.push();
    lines.push('| Category | Pass Rate | Tested |');
    lines.push('|----------|-----------|--------|');

    report.owaspCoverage.forEach((owasp: any) => {
      lines.push(`| ${owasp.category} | ${(owasp.passRate * 100).toFixed(1)}% | ${owasp.tested} |`);
    });
    lines.push();
  }

  // TPI Coverage
  if (report.tpiCoverage.length > 0) {
    lines.push('## CrowdStrike TPI Coverage');
    lines.push();
    lines.push('| Story | Pass Rate | Tested |');
    lines.push('|-------|-----------|--------|');

    report.tpiCoverage.forEach((tpi: any) => {
      lines.push(`| ${tpi.story} | ${(tpi.passRate * 100).toFixed(1)}% | ${tpi.tested} |`);
    });
    lines.push();
  }

  // Recommendations
  lines.push('## Recommendations');
  lines.push();

  if (report.injectionSuccessRate > 0.5) {
    lines.push('- **HIGH PRIORITY**: Model shows high injection success rate. Consider implementing stricter system prompt enforcement.');
  }

  if (report.harmfulnessRate > 0.3) {
    lines.push('- **HIGH PRIORITY**: Model frequently generates harmful responses. Implement additional content filtering.');
  }

  if (report.overallCoveragePercent < 80) {
    lines.push('- **MEDIUM PRIORITY**: Test coverage is below 80%. Run additional tests to improve confidence in results.');
  }

  if (report.avgResilienceScore >= 80) {
    lines.push('- Model shows strong security posture. Continue monitoring for regressions.');
  }

  lines.push();
  lines.push('---');
  lines.push();
  lines.push('*Generated by DojoLM LLM Testing Dashboard*');

  const safeModelName = (report.modelName || 'export').replace(/[^\w-]/g, '_');

  return NextResponse.json({
    format: 'md',
    content: lines.join('\n'),
    filename: `llm-report-${safeModelName}-${new Date().toISOString().split('T')[0]}.md`,
  });
}

/**
 * Export as CSV (flattened results)
 */
function exportAsCSV(report: any): Response {
  const rows: string[][] = [];

  // Header row
  rows.push([
    'Model', 'Provider', 'Test Case', 'Status', 'Resilience Score',
    'Injection Success', 'Harmfulness', 'Duration (ms)',
    'Categories Passed', 'Categories Failed',
    'OWASP Coverage', 'TPI Coverage', 'Timestamp',
  ]);

  // Data rows from each model's executions
  for (const model of report.models) {
    if (model.executions) {
      for (const exec of model.executions) {
        rows.push([
          csvEscape(model.modelName || model.modelConfigId),
          csvEscape(model.provider),
          csvEscape(exec.testCaseId),
          csvEscape(exec.status),
          String(exec.resilienceScore ?? ''),
          String(exec.injectionSuccess ?? ''),
          String(exec.harmfulness ?? ''),
          String(exec.duration_ms ?? ''),
          csvEscape((exec.categoriesPassed || []).join('; ')),
          csvEscape((exec.categoriesFailed || []).join('; ')),
          csvEscape(Object.keys(exec.owaspCoverage || {}).join('; ')),
          csvEscape(Object.keys(exec.tpiCoverage || {}).join('; ')),
          csvEscape(exec.timestamp || ''),
        ]);
      }
    } else {
      // No individual executions, use summary data
      rows.push([
        csvEscape(model.modelName || model.modelConfigId),
        csvEscape(model.provider),
        'Summary',
        'completed',
        String(model.avgResilienceScore),
        String(model.injectionSuccessRate),
        String(model.harmfulnessRate),
        String(model.avgDuration_ms),
        '',
        '',
        String(model.overallCoveragePercent) + '%',
        '',
        csvEscape(model.generatedAt || ''),
      ]);
    }
  }

  const csvContent = rows.map(row => row.join(',')).join('\n');

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="llm-results-${Date.now()}.csv"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Escape a CSV field value with formula injection prevention
 */
function csvEscape(value: string): string {
  if (!value) return '';
  // Neutralize formula injection: prefix dangerous leading chars with single quote
  const formulaStart = /^[=+\-@\t\r]/;
  let safe = formulaStart.test(value) ? `'${value}` : value;
  // If value contains comma, newline, or quote, wrap in quotes and escape inner quotes
  if (safe.includes(',') || safe.includes('\n') || safe.includes('"')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Export as SARIF 2.1.0 format
 */
function exportAsSARIF(report: any): NextResponse {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: report.models.map((model: any) => {
      // Build a category-to-rule-id map for consistent referencing
      const categoryRules = (model.byCategory || []).map((cat: any, i: number) => ({
        id: `DOJOLM-${String(i + 1).padStart(3, '0')}`,
        name: cat.category,
        shortDescription: {
          text: `Security test category: ${cat.category}`,
        },
        defaultConfiguration: {
          level: cat.passRate < 0.5 ? 'error' : cat.passRate < 0.8 ? 'warning' : 'note',
        },
        properties: {
          passRate: cat.passRate,
          avgScore: cat.avgScore,
          testCount: cat.count,
        },
      }));

      // Build category name -> ruleId lookup
      const categoryToRuleId: Record<string, string> = {};
      (model.byCategory || []).forEach((cat: any, i: number) => {
        categoryToRuleId[cat.category] = `DOJOLM-${String(i + 1).padStart(3, '0')}`;
      });

      return {
        tool: {
          driver: {
            name: 'DojoLM LLM Security Scanner',
            version: '2.0.0',
            informationUri: 'https://github.com/bu-tpi/dojolm',
            rules: categoryRules,
          },
        },
        results: (model.executions || [])
          .filter((exec: any) => exec.status === 'completed')
          .map((exec: any) => {
            // Find the matching ruleId from the failed categories
            const failedCat = (exec.categoriesFailed || [])[0];
            const ruleId = failedCat ? categoryToRuleId[failedCat] : undefined;

            return {
              ruleId,
              level: exec.resilienceScore < 30 ? 'error'
                : exec.resilienceScore < 70 ? 'warning'
                : 'note',
              message: {
                text: `Model ${model.modelName} scored ${exec.resilienceScore}/100 on test ${exec.testCaseId}. Injection success: ${(exec.injectionSuccess * 100).toFixed(1)}%, Harmfulness: ${(exec.harmfulness * 100).toFixed(1)}%`,
              },
              locations: [{
                logicalLocations: [{
                  name: exec.testCaseId,
                  kind: 'testCase',
                }],
              }],
              properties: {
                resilienceScore: exec.resilienceScore,
                injectionSuccess: exec.injectionSuccess,
                harmfulness: exec.harmfulness,
                duration_ms: exec.duration_ms,
                categoriesPassed: exec.categoriesPassed,
                categoriesFailed: exec.categoriesFailed,
                modelId: model.modelConfigId,
              },
            };
          }),
        invocations: [{
          executionSuccessful: !!report.batchCompletedAt,
          startTimeUtc: report.batchStartedAt ?? report.generatedAt,
          endTimeUtc: report.batchCompletedAt ?? undefined,
        }],
        properties: {
          modelId: model.modelConfigId,
          modelName: model.modelName,
          provider: model.provider,
          avgResilienceScore: model.avgResilienceScore,
          overallCoverage: model.overallCoveragePercent,
        },
      };
    }),
  };

  return NextResponse.json(sarif, {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="llm-sarif-${Date.now()}.sarif.json"`,
    },
  });
}
