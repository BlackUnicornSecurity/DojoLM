/**
 * KATANA Validation Report Generator (K3.8)
 *
 * Generates validation reports in multiple formats:
 * - JSON (archival)
 * - Markdown (human review)
 * - CSV (analysis)
 *
 * Reports include:
 * - Per-module metrics + CI + decision rule result
 * - Per-module confusion matrix
 * - False positive/negative lists with sample IDs
 * - Uncertainty budget summary
 * - Traceability chain summary
 * - Digital signature (Ed25519) for report integrity
 *
 * ISO 17025 Clauses: 7.2.2, 7.6, 7.8.6
 */

import { randomUUID } from 'node:crypto';
import {
  SCHEMA_VERSION,
  type ValidationRun,
  type ValidationReport,
  type ConfusionMatrix,
  type ValidationMetrics,
  type DecisionRuleResult,
  type UncertaintyEstimate,
} from '../types.js';
import { computeUncertaintyBudget } from '../runner/uncertainty-estimator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportOptions {
  /** Module tier assignments (module_id → tier) */
  moduleTiers?: Record<string, number>;
  /** Calibration certificate IDs (module_id → certificate_id) */
  calibrationCertificates?: Record<string, string>;
}

export type ReportFormat = 'json' | 'markdown' | 'csv';

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

/**
 * Generate a ValidationReport from a completed validation run.
 *
 * @param run - Completed validation run
 * @param options - Report configuration
 * @returns Structured validation report
 */
export function generateReport(
  run: ValidationRun,
  options: ReportOptions = {},
): ValidationReport {
  const modules = run.modules_validated.map(moduleId => {
    const matrix = run.per_module_matrices[moduleId];
    const metrics = run.per_module_metrics[moduleId];
    const decision = run.per_module_decisions[moduleId];

    if (!matrix || !metrics || !decision) {
      throw new Error(`Missing results for module '${moduleId}'`);
    }

    const uncertainty = computeUncertaintyBudget(moduleId, matrix);
    const tier = options.moduleTiers?.[moduleId] ?? 1;
    const certId = options.calibrationCertificates?.[moduleId] ?? 'none';

    return {
      module_id: moduleId,
      tier,
      matrix,
      metrics,
      uncertainty,
      decision,
      calibration_certificate_id: certId,
    };
  });

  return {
    schema_version: SCHEMA_VERSION,
    report_id: randomUUID(),
    run_id: run.run_id,
    generated_at: new Date().toISOString(),
    environment: run.environment,
    corpus_version: run.corpus_version,
    tool_version: run.environment.package_version,
    modules,
    overall_verdict: run.overall_verdict,
    non_conformity_count: run.non_conformity_count,
  };
}

// ---------------------------------------------------------------------------
// Format Exporters
// ---------------------------------------------------------------------------

/**
 * Export report as JSON string.
 */
export function exportReportJSON(report: ValidationReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Export report as Markdown string.
 */
export function exportReportMarkdown(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push('# DojoLM Validation Testing Report');
  lines.push('');
  lines.push(`**Report ID:** ${report.report_id}`);
  lines.push(`**Run ID:** ${report.run_id}`);
  lines.push(`**Generated:** ${report.generated_at}`);
  lines.push(`**Corpus Version:** ${report.corpus_version}`);
  lines.push(`**Tool Version:** ${report.tool_version}`);
  lines.push(`**Overall Verdict:** ${report.overall_verdict}`);
  lines.push(`**Non-Conformities:** ${report.non_conformity_count}`);
  lines.push('');

  // Executive summary
  lines.push('## Executive Summary');
  lines.push('');
  const passed = report.modules.filter(m => m.decision.verdict === 'PASS').length;
  const failed = report.modules.filter(m => m.decision.verdict === 'FAIL').length;
  lines.push(`- **Modules Validated:** ${report.modules.length}`);
  lines.push(`- **Passed:** ${passed}`);
  lines.push(`- **Failed:** ${failed}`);
  lines.push(`- **Overall:** ${report.overall_verdict}`);
  lines.push('');

  // Environment
  lines.push('## Environment');
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| OS | ${escapeMd(report.environment.os.platform)} ${escapeMd(report.environment.os.arch)} ${escapeMd(report.environment.os.release)} |`);
  lines.push(`| Node.js | ${escapeMd(report.environment.node.version)} |`);
  lines.push(`| CPU | ${escapeMd(report.environment.cpu.model)} (${report.environment.cpu.cores} cores) |`);
  lines.push(`| Memory | ${report.environment.memory.total_mb} MB |`);
  lines.push(`| Git Hash | ${escapeMd(report.environment.git.hash)} |`);
  lines.push(`| Git Dirty | ${report.environment.git.dirty} |`);
  lines.push(`| Timezone | ${escapeMd(report.environment.timezone)} |`);
  lines.push('');

  // Per-module results
  lines.push('## Per-Module Results');
  lines.push('');

  for (const mod of report.modules) {
    lines.push(`### ${mod.module_id} (Tier ${mod.tier})`);
    lines.push('');
    lines.push(`**Verdict:** ${mod.decision.verdict}`);
    lines.push(`**Calibration Certificate:** ${mod.calibration_certificate_id}`);
    lines.push('');

    // Confusion matrix
    lines.push('#### Confusion Matrix');
    lines.push('');
    lines.push('|  | Predicted Malicious | Predicted Clean |');
    lines.push('|--|--------------------:|----------------:|');
    lines.push(`| **Actual Malicious** | TP: ${mod.matrix.tp} | FN: ${mod.matrix.fn} |`);
    lines.push(`| **Actual Clean** | FP: ${mod.matrix.fp} | TN: ${mod.matrix.tn} |`);
    lines.push(`| **Total** | | ${mod.matrix.total} |`);
    lines.push('');

    // Metrics
    lines.push('#### Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|------:|');
    lines.push(`| Accuracy | ${formatPct(mod.metrics.accuracy)} |`);
    lines.push(`| Precision | ${formatPct(mod.metrics.precision)} |`);
    lines.push(`| Recall | ${formatPct(mod.metrics.recall)} |`);
    lines.push(`| F1 Score | ${formatPct(mod.metrics.f1)} |`);
    lines.push(`| MCC | ${mod.metrics.mcc.toFixed(4)} |`);
    lines.push(`| Specificity | ${formatPct(mod.metrics.specificity)} |`);
    lines.push(`| FPR | ${formatPct(mod.metrics.fpr)} |`);
    lines.push(`| FNR | ${formatPct(mod.metrics.fnr)} |`);
    lines.push('');

    // Uncertainty
    if (mod.uncertainty.length > 0) {
      lines.push('#### Uncertainty Budget');
      lines.push('');
      lines.push('| Metric | Point Estimate | Wilson CI | Clopper-Pearson CI | Expanded (k=2) |');
      lines.push('|--------|---------------:|----------:|-------------------:|---------------:|');
      for (const u of mod.uncertainty) {
        lines.push(
          `| ${u.metric} | ${formatPct(u.point_estimate)} | [${formatPct(u.wilson_ci_lower)}, ${formatPct(u.wilson_ci_upper)}] | [${formatPct(u.clopper_pearson_lower)}, ${formatPct(u.clopper_pearson_upper)}] | ±${formatPct(u.expanded_uncertainty)} |`,
        );
      }
      lines.push('');
    }

    // Non-conformities
    if (mod.decision.non_conformities.length > 0) {
      lines.push('#### Non-Conformities');
      lines.push('');
      lines.push('| Sample ID | Type | Expected | Actual |');
      lines.push('|-----------|------|----------|--------|');
      for (const nc of mod.decision.non_conformities) {
        lines.push(`| ${escapeMd(nc.sample_id)} | ${escapeMd(nc.type)} | ${escapeMd(nc.expected)} | ${escapeMd(nc.actual)} |`);
      }
      lines.push('');
    }

    // Decision rule
    lines.push('#### Decision Rule (ISO 7.8.6)');
    lines.push('');
    lines.push(`- **Rule:** Zero-defect acceptance (0 FP + 0 FN = PASS)`);
    lines.push(`- **False Positives:** ${mod.decision.false_positives}`);
    lines.push(`- **False Negatives:** ${mod.decision.false_negatives}`);
    lines.push(`- **Verdict:** ${mod.decision.verdict}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Non-conformity register
  const allNCs = report.modules.flatMap(m =>
    m.decision.non_conformities.map(nc => ({
      ...nc,
      module_id: m.module_id,
    })),
  );

  if (allNCs.length > 0) {
    lines.push('## Non-Conformity Register');
    lines.push('');
    lines.push('| # | Module | Sample ID | Type | Expected | Actual |');
    lines.push('|---|--------|-----------|------|----------|--------|');
    allNCs.forEach((nc, i) => {
      lines.push(`| ${i + 1} | ${escapeMd(nc.module_id)} | ${escapeMd(nc.sample_id)} | ${escapeMd(nc.type)} | ${escapeMd(nc.expected)} | ${escapeMd(nc.actual)} |`);
    });
    lines.push('');
  }

  // Signature
  if (report.signature) {
    lines.push('## Digital Signature');
    lines.push('');
    lines.push(`**Algorithm:** Ed25519`);
    lines.push(`**Signature:** \`${report.signature}\``);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Report generated by KATANA Validation Framework — ISO/IEC 17025:2017*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Export report as CSV (one row per module).
 */
export function exportReportCSV(report: ValidationReport): string {
  const headers = [
    'module_id',
    'tier',
    'verdict',
    'total_samples',
    'tp',
    'tn',
    'fp',
    'fn',
    'accuracy',
    'precision',
    'recall',
    'f1',
    'mcc',
    'specificity',
    'fpr',
    'fnr',
    'false_positives',
    'false_negatives',
    'calibration_certificate_id',
  ];

  const rows = report.modules.map(mod => [
    csvField(mod.module_id),
    mod.tier,
    csvField(mod.decision.verdict),
    mod.matrix.total,
    mod.matrix.tp,
    mod.matrix.tn,
    mod.matrix.fp,
    mod.matrix.fn,
    mod.metrics.accuracy,
    mod.metrics.precision,
    mod.metrics.recall,
    mod.metrics.f1,
    mod.metrics.mcc,
    mod.metrics.specificity,
    mod.metrics.fpr,
    mod.metrics.fnr,
    mod.decision.false_positives,
    mod.decision.false_negatives,
    csvField(mod.calibration_certificate_id),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export report in the specified format.
 */
export function exportReport(
  report: ValidationReport,
  format: ReportFormat,
): string {
  switch (format) {
    case 'json':
      return exportReportJSON(report);
    case 'markdown':
      return exportReportMarkdown(report);
    case 'csv':
      return exportReportCSV(report);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Escape a string for safe inclusion in a CSV field.
 * Prevents formula injection (=, +, -, @, TAB, CR) and handles commas/quotes.
 */
function csvField(value: unknown): string {
  const s = String(value);
  const safe = s.replace(/^([=+\-@\t\r])/, "'$1");
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Escape a string for safe inclusion in a Markdown table cell.
 * Escapes pipe characters that would break table formatting.
 */
function escapeMd(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
}
