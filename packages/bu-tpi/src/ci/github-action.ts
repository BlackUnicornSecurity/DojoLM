/**
 * MUSUBI: GitHub Action Entrypoint
 * Reads inputs from environment, runs scan, generates reports,
 * and sets exit code based on findings vs fail_on threshold.
 */

import { scan } from '../scanner.js';
import { generateSarifReport } from './sarif-reporter.js';
import { generateJUnitReport } from './junit-reporter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Severity threshold for failing the action */
export type FailOnLevel = 'critical' | 'warning' | 'info';

/** Report format for output */
export type ActionReportFormat = 'sarif' | 'junit';

/** Configuration for the GitHub Action run */
export interface GitHubActionConfig {
  readonly text?: string;
  readonly file?: string;
  readonly format: ActionReportFormat;
  readonly failOn: FailOnLevel;
  readonly outputPath?: string;
}

/** Result of running the GitHub Action */
export interface GitHubActionResult {
  readonly success: boolean;
  readonly exitCode: number;
  readonly findingsCount: number;
  readonly criticalCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly reportPath: string | null;
  readonly summary: string;
}

// ---------------------------------------------------------------------------
// Severity Mapping
// ---------------------------------------------------------------------------

const SEVERITY_LEVELS: Readonly<Record<FailOnLevel, number>> = {
  info: 0,
  warning: 1,
  critical: 2,
};

function severityToLevel(severity: string | null): number {
  switch (severity) {
    case 'CRITICAL':
      return 2;
    case 'WARNING':
      return 1;
    case 'INFO':
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Environment Reading
// ---------------------------------------------------------------------------

/**
 * Read GitHub Action configuration from environment variables.
 * Uses INPUT_ prefix convention for GitHub Actions.
 */
export function readActionConfig(): GitHubActionConfig {
  const text = process.env['INPUT_TEXT'] ?? undefined;
  const file = process.env['INPUT_FILE'] ?? undefined;
  const format = (process.env['INPUT_FORMAT'] ?? 'sarif') as ActionReportFormat;
  const failOn = (process.env['INPUT_FAIL_ON'] ?? 'critical') as FailOnLevel;
  const outputPath = process.env['INPUT_OUTPUT_PATH'] ?? undefined;

  // Validate format
  const validFormats: readonly ActionReportFormat[] = ['sarif', 'junit'];
  const safeFormat = validFormats.includes(format) ? format : 'sarif';

  // Validate failOn
  const validFailOn: readonly FailOnLevel[] = ['critical', 'warning', 'info'];
  const safeFailOn = validFailOn.includes(failOn) ? failOn : 'critical';

  return {
    text,
    file,
    format: safeFormat,
    failOn: safeFailOn,
    outputPath,
  };
}

// ---------------------------------------------------------------------------
// File Reading
// ---------------------------------------------------------------------------

async function readInputFile(filePath: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  return readFile(filePath, 'utf-8');
}

// ---------------------------------------------------------------------------
// Output Writing
// ---------------------------------------------------------------------------

async function writeOutput(path: string, content: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path, content, 'utf-8');
}

/**
 * Write GitHub Actions output variables.
 * Appends to GITHUB_OUTPUT file if available.
 */
async function writeGitHubOutput(
  variables: Readonly<Record<string, string>>,
): Promise<void> {
  const outputFile = process.env['GITHUB_OUTPUT'];
  if (!outputFile) return;

  const { appendFile } = await import('node:fs/promises');
  const lines = Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  await appendFile(outputFile, lines + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the GitHub Action scan pipeline.
 * @param config - Action configuration (or reads from environment if not provided)
 * @returns The action result with exit code and summary
 */
export async function runGitHubAction(
  config?: GitHubActionConfig,
): Promise<GitHubActionResult> {
  const actionConfig = config ?? readActionConfig();

  // Get input text
  let inputText: string;
  if (actionConfig.text) {
    inputText = actionConfig.text;
  } else if (actionConfig.file) {
    inputText = await readInputFile(actionConfig.file);
  } else {
    return {
      success: false,
      exitCode: 1,
      findingsCount: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      reportPath: null,
      summary: 'Error: No input provided. Set INPUT_TEXT or INPUT_FILE.',
    };
  }

  // Run scan
  const scanResult = scan(inputText);

  // Count findings by severity
  const criticalCount = scanResult.findings.filter((f) => f.severity === 'CRITICAL').length;
  const warningCount = scanResult.findings.filter((f) => f.severity === 'WARNING').length;
  const infoCount = scanResult.findings.filter((f) => f.severity === 'INFO').length;
  const findingsCount = scanResult.findings.length;

  // Generate report
  let reportContent: string;
  if (actionConfig.format === 'junit') {
    reportContent = generateJUnitReport(scanResult);
  } else {
    const sarifReport = generateSarifReport(scanResult);
    reportContent = JSON.stringify(sarifReport, null, 2);
  }

  // Write report to file if output path specified
  let reportPath: string | null = null;
  if (actionConfig.outputPath) {
    await writeOutput(actionConfig.outputPath, reportContent);
    reportPath = actionConfig.outputPath;
  }

  // Determine if action should fail based on threshold
  const failThreshold = SEVERITY_LEVELS[actionConfig.failOn];
  const hasFailingFindings = scanResult.findings.some(
    (f) => severityToLevel(f.severity) >= failThreshold,
  );

  const exitCode = hasFailingFindings ? 1 : 0;

  // Write GitHub Actions output variables
  await writeGitHubOutput({
    findings_count: String(findingsCount),
    critical_count: String(criticalCount),
    warning_count: String(warningCount),
    info_count: String(infoCount),
    verdict: scanResult.verdict,
    exit_code: String(exitCode),
  });

  const summary = hasFailingFindings
    ? `Scan failed: ${findingsCount} findings (${criticalCount} critical, ${warningCount} warning, ${infoCount} info) — threshold: ${actionConfig.failOn}`
    : `Scan passed: ${findingsCount} findings (${criticalCount} critical, ${warningCount} warning, ${infoCount} info) — threshold: ${actionConfig.failOn}`;

  return {
    success: !hasFailingFindings,
    exitCode,
    findingsCount,
    criticalCount,
    warningCount,
    infoCount,
    reportPath,
    summary,
  };
}
