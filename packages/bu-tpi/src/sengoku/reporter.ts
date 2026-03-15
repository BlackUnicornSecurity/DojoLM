/**
 * H17.5: Sengoku Campaign Report Generator
 * Markdown and JSON report generation with sanitized content.
 */

import type {
  Campaign,
  CampaignRun,
  FindingDiff,
  SengokuReport,
  SengokuFinding,
} from './types.js';
import { MAX_PAYLOAD_LENGTH } from './types.js';

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

function sanitize(text: string): string {
  return text
    .slice(0, MAX_PAYLOAD_LENGTH)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

/** Generate a structured report from a campaign run. */
export function generateReport(
  campaign: Campaign,
  run: CampaignRun,
  diff: FindingDiff,
): SengokuReport {
  const bySeverity: Record<string, SengokuFinding[]> = {
    CRITICAL: [],
    WARNING: [],
    INFO: [],
  };
  for (const f of run.findings) {
    (bySeverity[f.severity] ??= []).push(f);
  }

  const summary = [
    `Campaign "${campaign.name}" run #${run.runNumber}`,
    `completed at ${run.completedAt ?? 'in progress'}.`,
    `Total findings: ${run.findings.length}`,
    `(${bySeverity['CRITICAL'].length} critical,`,
    `${bySeverity['WARNING'].length} warning,`,
    `${bySeverity['INFO'].length} info).`,
    diff.regressedFindings.length > 0
      ? `Regressions detected: ${diff.regressedFindings.length}.`
      : 'No regressions.',
    diff.newFindings.length > 0
      ? `New findings: ${diff.newFindings.length}.`
      : '',
    diff.resolvedFindings.length > 0
      ? `Resolved: ${diff.resolvedFindings.length}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    campaignId: campaign.id,
    runId: run.id,
    generatedAt: new Date().toISOString(),
    executiveSummary: summary,
    findingsBySeverity: bySeverity,
    regressions: run.regressionAlerts,
    diff,
  };
}

// ---------------------------------------------------------------------------
// Markdown Formatter
// ---------------------------------------------------------------------------

export function formatReportMarkdown(report: SengokuReport): string {
  const lines: string[] = [
    `# Sengoku Campaign Report`,
    '',
    `**Campaign:** ${report.campaignId}`,
    `**Run:** ${report.runId}`,
    `**Generated:** ${report.generatedAt}`,
    '',
    '## Executive Summary',
    '',
    report.executiveSummary,
    '',
    '## Findings by Severity',
    '',
  ];

  for (const sev of ['CRITICAL', 'WARNING', 'INFO'] as const) {
    const findings = report.findingsBySeverity[sev] ?? [];
    lines.push(`### ${sev} (${findings.length})`);
    lines.push('');
    if (findings.length === 0) {
      lines.push('_None_');
    } else {
      lines.push('| Category | Payload (truncated) |');
      lines.push('|----------|-------------------|');
      for (const f of findings) {
        lines.push(
          `| ${f.category} | ${sanitize(f.attackPayload).slice(0, 80)} |`,
        );
      }
    }
    lines.push('');
  }

  if (report.regressions.length > 0) {
    lines.push('## Regressions');
    lines.push('');
    lines.push('| Finding | Previously Resolved In | Regressed In |');
    lines.push('|---------|----------------------|-------------|');
    for (const r of report.regressions) {
      lines.push(
        `| ${r.findingId} | Run ${r.previouslyResolvedInRunId} | Run ${r.regressedInRunId} |`,
      );
    }
    lines.push('');
  }

  if (report.diff.newFindings.length > 0) {
    lines.push(`## New Findings (${report.diff.newFindings.length})`);
    lines.push('');
    for (const f of report.diff.newFindings) {
      lines.push(`- **${f.category}** [${f.severity}]: ${sanitize(f.attackPayload).slice(0, 60)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON Formatter
// ---------------------------------------------------------------------------

export function formatReportJSON(report: SengokuReport): string {
  const sanitized = {
    ...report,
    findingsBySeverity: Object.fromEntries(
      Object.entries(report.findingsBySeverity).map(([sev, findings]) => [
        sev,
        (findings as SengokuFinding[]).map((f) => ({
          ...f,
          attackPayload: sanitize(f.attackPayload),
          response: sanitize(f.response),
        })),
      ]),
    ),
  };
  return JSON.stringify(sanitized, null, 2);
}
