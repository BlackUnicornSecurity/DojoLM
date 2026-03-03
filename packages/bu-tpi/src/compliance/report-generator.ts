/**
 * S65: Compliance Engine Report Generator
 * Generates full compliance reports across all frameworks.
 */

import type {
  ComplianceFramework,
  ComplianceReport,
  FrameworkReport,
} from './types.js';
import { ALL_FRAMEWORKS } from './frameworks.js';
import { getAllMappings, calculateCoverage } from './mapper.js';

/**
 * Generate a full compliance report across all frameworks.
 */
export function generateFullReport(
  moduleNames: string[],
  fixtureCategories: Record<string, number>,
  frameworks?: ComplianceFramework[]
): ComplianceReport {
  const targetFrameworks = frameworks ?? ALL_FRAMEWORKS;
  const frameworkReports: FrameworkReport[] = [];

  for (const framework of targetFrameworks) {
    frameworkReports.push(
      generateFrameworkReport(framework, moduleNames, fixtureCategories)
    );
  }

  const overallScore =
    frameworkReports.length > 0
      ? Math.round(
          frameworkReports.reduce((sum, r) => sum + r.coverage, 0) /
            frameworkReports.length
        )
      : 0;

  return {
    generated: new Date().toISOString(),
    frameworks: frameworkReports,
    overallScore,
  };
}

/**
 * Generate a report for a single framework.
 */
export function generateFrameworkReport(
  framework: ComplianceFramework,
  moduleNames: string[],
  fixtureCategories: Record<string, number>
): FrameworkReport {
  const mappings = getAllMappings(framework, moduleNames, fixtureCategories);
  const coverage = calculateCoverage(framework, mappings);

  const coveredControlIds = new Set(mappings.map((m) => m.controlId));
  const gaps = framework.controls.filter((c) => !coveredControlIds.has(c.id));

  return {
    framework,
    coverage,
    gaps,
    covered: mappings,
  };
}

/**
 * Format a compliance report as markdown.
 */
export function formatReportAsMarkdown(report: ComplianceReport): string {
  const lines: string[] = [
    '# Compliance Report',
    '',
    `**Generated**: ${report.generated}`,
    `**Overall Score**: ${report.overallScore}%`,
    '',
    '## Framework Summary',
    '',
    '| Framework | Coverage | Gaps | Covered Controls |',
    '|-----------|----------|------|------------------|',
  ];

  for (const fr of report.frameworks) {
    lines.push(
      `| ${fr.framework.name} (${fr.framework.version}) | ${fr.coverage}% | ${fr.gaps.length} | ${fr.covered.length} |`
    );
  }

  lines.push('');

  for (const fr of report.frameworks) {
    lines.push(`## ${fr.framework.name}`, '');
    lines.push(`Coverage: **${fr.coverage}%**`, '');

    if (fr.gaps.length > 0) {
      lines.push('### Gaps', '');
      for (const gap of fr.gaps) {
        lines.push(`- **${gap.id}**: ${gap.name} - ${gap.description}`);
      }
      lines.push('');
    }

    if (fr.covered.length > 0) {
      lines.push('### Covered Controls', '');
      for (const mapping of fr.covered) {
        lines.push(
          `- **${mapping.controlId}**: Covered by modules [${mapping.moduleNames.join(', ')}] + fixtures [${mapping.fixtureCategories.join(', ')}]`
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format a compliance report as JSON.
 */
export function formatReportAsJSON(report: ComplianceReport): string {
  return JSON.stringify(report, null, 2);
}
