#!/usr/bin/env node
/**
 * TPI Scanner CLI — Command-line interface for prompt injection scanning
 *
 * Modes:
 *   --file <path>               Scan a single file (auto-detects text vs binary)
 *   --text <string>             Scan inline text
 *   --dir <path> --glob <pat>   Scan files in a directory recursively
 *   (stdin)                     Pipe text via stdin when no mode flag is given
 *
 * @module cli/tpi-scan
 */

import { parseArgs } from 'node:util';
import { readFileSync, readdirSync, statSync, lstatSync, writeFileSync, realpathSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

import { scan } from '../scanner.js';
import { scanBinary } from '../scanner-binary.js';
import type { ScanResult } from '../types.js';
import {
  formatText,
  formatJson,
  formatSarif,
  formatJunit,
  formatCsv,
  type ScanEntry,
} from './formatters.js';
import { computeTrustScore } from '../modules/shingan-trust.js';

// ---------------------------------------------------------------------------
// INDEX
// ---------------------------------------------------------------------------
// 1. Constants & Types
// 2. Argument Parsing
// 3. File Detection
// 4. Directory Walking
// 5. Scan Orchestration
// 6. Output & Exit
// 7. Main Entry Point
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 0. SECURITY HELPERS
// ---------------------------------------------------------------------------

/** Resolve output path and enforce CWD boundary to prevent path traversal. */
function resolveOutputPath(outputArg: string): string {
  const resolvedOutput = resolve(outputArg);
  const cwd = resolve('.');
  if (resolvedOutput !== cwd && !resolvedOutput.startsWith(cwd + '/')) {
    process.stderr.write(`Error: output path "${resolvedOutput}" is outside the current working directory\n`);
    process.exit(2);
  }
  return resolvedOutput;
}

// ---------------------------------------------------------------------------
// 1. CONSTANTS & TYPES
// ---------------------------------------------------------------------------

const TEXT_EXTS = new Set([
  '.html', '.svg', '.md', '.yaml', '.yml', '.txt', '.xml', '.json',
  '.js', '.ts', '.py', '.sh', '.css', '.sql', '.srt', '.php',
  '.c', '.cpp', '.h', '.hpp', '.java', '.go', '.rs', '.rb', '.pl',
]);

type OutputFormat = 'text' | 'json' | 'sarif' | 'junit' | 'csv';
type ThresholdSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

const SEVERITY_RANK: Readonly<Record<ThresholdSeverity, number>> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

const VALID_FORMATS: ReadonlySet<string> = new Set(['text', 'json', 'sarif', 'junit', 'csv']);
const VALID_THRESHOLDS: ReadonlySet<string> = new Set(['INFO', 'WARNING', 'CRITICAL']);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// 2. ARGUMENT PARSING
// ---------------------------------------------------------------------------

interface CliArgs {
  readonly file?: string;
  readonly text?: string;
  readonly dir?: string;
  readonly glob: string;
  readonly engines?: readonly string[];
  readonly format: OutputFormat;
  readonly output?: string;
  readonly threshold?: ThresholdSeverity;
  readonly quiet: boolean;
  readonly summary: boolean;
  readonly version: boolean;
  readonly help: boolean;
  readonly skill?: string;
}

function parseCliArgs(argv: readonly string[]): CliArgs {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      file: { type: 'string', short: 'f' },
      text: { type: 'string', short: 't' },
      dir: { type: 'string', short: 'd' },
      glob: { type: 'string', short: 'g', default: '*' },
      engines: { type: 'string', short: 'e' },
      format: { type: 'string', default: 'text' },
      output: { type: 'string', short: 'o' },
      threshold: { type: 'string' },
      quiet: { type: 'boolean', short: 'q', default: false },
      summary: { type: 'boolean', short: 's', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      skill: { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });

  // Validate format
  const format = (values.format ?? 'text') as string;
  if (!VALID_FORMATS.has(format)) {
    throw new Error(`Invalid format "${format}". Must be one of: text, json, sarif, junit, csv`);
  }

  // Validate threshold
  const threshold = values.threshold as string | undefined;
  if (threshold !== undefined && !VALID_THRESHOLDS.has(threshold)) {
    throw new Error(`Invalid threshold "${threshold}". Must be one of: INFO, WARNING, CRITICAL`);
  }

  // Parse engines
  const engines = values.engines
    ? (values.engines as string).split(',').map((e) => e.trim()).filter(Boolean)
    : undefined;

  return {
    file: values.file as string | undefined,
    text: values.text as string | undefined,
    dir: values.dir as string | undefined,
    glob: (values.glob ?? '*') as string,
    engines: engines ? Object.freeze(engines) : undefined,
    format: format as OutputFormat,
    output: values.output as string | undefined,
    threshold: threshold as ThresholdSeverity | undefined,
    quiet: Boolean(values.quiet),
    summary: Boolean(values.summary),
    version: Boolean(values.version),
    help: Boolean(values.help),
    skill: values.skill as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// 3. FILE DETECTION
// ---------------------------------------------------------------------------

function isTextFile(filepath: string): boolean {
  const ext = extname(filepath).toLowerCase();
  return TEXT_EXTS.has(ext);
}

// ---------------------------------------------------------------------------
// 4. DIRECTORY WALKING
// ---------------------------------------------------------------------------

function walkDir(dirPath: string, pattern: string): readonly string[] {
  const results: string[] = [];
  const globRegex = globToRegex(pattern);

  function recurse(currentPath: string): void {
    let entries: string[];
    try {
      entries = readdirSync(currentPath);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      let stat;
      try {
        stat = lstatSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isSymbolicLink()) {
        continue;
      }
      if (stat.isDirectory()) {
        recurse(fullPath);
      } else if (stat.isFile() && globRegex.test(entry)) {
        results.push(fullPath);
      }
    }
  }

  recurse(resolve(dirPath));
  return Object.freeze(results);
}

/**
 * Convert a simple glob pattern to a RegExp.
 * Supports * (any chars) and ? (single char).
 * Enforces max length and collapses repeated wildcards to prevent ReDoS.
 */
function globToRegex(pattern: string): RegExp {
  if (pattern.length > 128) {
    throw new Error('Glob pattern exceeds maximum length of 128 characters');
  }
  // Collapse consecutive wildcards (e.g. "a**b" → "a*b") to prevent catastrophic backtracking
  const collapsed = pattern.replace(/\*{2,}/g, '*');
  const escaped = collapsed
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

// ---------------------------------------------------------------------------
// 5. SCAN ORCHESTRATION
// ---------------------------------------------------------------------------

async function scanFile(
  filepath: string,
  engines?: readonly string[],
): Promise<ScanEntry> {
  const resolvedPath = resolve(filepath);
  const scanOptions = engines ? { engines: [...engines] } : undefined;

  // Guard: reject files larger than 50 MB to prevent OOM
  const fileStat = statSync(resolvedPath);
  if (fileStat.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File "${resolvedPath}" is ${(fileStat.size / (1024 * 1024)).toFixed(1)} MB, exceeding the 50 MB limit`,
    );
  }

  if (isTextFile(resolvedPath)) {
    const content = readFileSync(resolvedPath, 'utf-8');
    const result = scan(content, scanOptions);
    return { result, filename: resolvedPath };
  }

  // Binary file
  const buffer = readFileSync(resolvedPath);
  const result = await scanBinary(buffer, resolvedPath);
  // If engines filter was specified, filter findings by engine
  if (engines && engines.length > 0) {
    const engineSet = new Set(engines);
    const filtered = result.findings.filter((f) => engineSet.has(f.engine));
    return {
      result: {
        ...result,
        findings: filtered,
        counts: {
          critical: filtered.filter((f) => f.severity === 'CRITICAL').length,
          warning: filtered.filter((f) => f.severity === 'WARNING').length,
          info: filtered.filter((f) => f.severity === 'INFO').length,
        },
      },
      filename: resolvedPath,
    };
  }

  return { result, filename: resolvedPath };
}

function scanText(
  text: string,
  engines?: readonly string[],
): ScanEntry {
  const scanOptions = engines ? { engines: [...engines] } : undefined;
  const result = scan(text, scanOptions);
  return { result };
}

async function scanDir(
  dirPath: string,
  pattern: string,
  engines?: readonly string[],
): Promise<readonly ScanEntry[]> {
  const files = walkDir(dirPath, pattern);

  if (files.length === 0) {
    process.stderr.write(`Warning: No files matched pattern "${pattern}" in directory "${dirPath}"\n`);
    return Object.freeze([]);
  }

  const entries: ScanEntry[] = [];
  for (const file of files) {
    try {
      const entry = await scanFile(file, engines);
      entries.push(entry);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Log warning but continue scanning other files
      if (!process.env.TPI_QUIET) {
        process.stderr.write(`Warning: Failed to scan ${file}: ${message}\n`);
      }
    }
  }

  return Object.freeze(entries);
}

async function scanStdin(engines?: readonly string[]): Promise<ScanEntry> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  return new Promise((resolvePromise, reject) => {
    process.stdin.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_FILE_SIZE_BYTES) {
        process.stdin.destroy();
        reject(new Error(`Stdin input exceeds the 50 MB limit`));
        return;
      }
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        if (text.length === 0) {
          reject(new Error('No input received from stdin'));
          return;
        }
        const scanOptions = engines ? { engines: [...engines] } : undefined;
        const result = scan(text, scanOptions);
        resolvePromise({ result, filename: '<stdin>' });
      } catch (err) {
        reject(err);
      }
    });

    process.stdin.on('error', reject);

    // If stdin is a TTY (no pipe), show help
    if (process.stdin.isTTY) {
      reject(new Error('No input provided. Use --file, --text, --dir, or pipe via stdin. Run with --help for usage.'));
    }
  });
}

// ---------------------------------------------------------------------------
// 6. OUTPUT & EXIT
// ---------------------------------------------------------------------------

function formatOutput(entries: readonly ScanEntry[], format: OutputFormat): string {
  switch (format) {
    case 'json': {
      if (entries.length === 1) {
        return formatJson(entries[0].result);
      }
      return JSON.stringify(
        entries.map((e) => ({ filename: e.filename, ...e.result })),
        null,
        2,
      );
    }
    case 'sarif':
      return formatSarif(entries);
    case 'junit':
      return formatJunit(entries);
    case 'csv': {
      if (entries.length === 1) {
        return formatCsv(entries[0].result, entries[0].filename);
      }
      // Multi-file CSV: header once, then rows from each entry
      const header = 'file,category,severity,description,match,engine';
      const rows = entries.flatMap((e) =>
        formatCsv(e.result, e.filename).split('\n').slice(1),
      );
      return [header, ...rows].join('\n');
    }
    case 'text':
    default: {
      return entries.map((e) => formatText(e.result, e.filename)).join('\n\n');
    }
  }
}

function formatSummaryLine(entries: readonly ScanEntry[]): string {
  const totalFindings = entries.reduce((sum, e) => sum + e.result.findings.length, 0);
  const totalCritical = entries.reduce((sum, e) => sum + e.result.counts.critical, 0);
  const totalWarning = entries.reduce((sum, e) => sum + e.result.counts.warning, 0);
  const totalInfo = entries.reduce((sum, e) => sum + e.result.counts.info, 0);
  const verdicts = entries.map((e) => e.result.verdict);
  const overallVerdict = verdicts.includes('BLOCK') ? 'BLOCK' : 'ALLOW';
  const fileCount = entries.length;

  return `${overallVerdict} | ${fileCount} file(s) | ${totalFindings} finding(s): ${totalCritical} critical, ${totalWarning} warning, ${totalInfo} info`;
}

function computeExitCode(
  entries: readonly ScanEntry[],
  threshold?: ThresholdSeverity,
): number {
  if (threshold !== undefined) {
    const thresholdRank = SEVERITY_RANK[threshold];
    const hasAboveThreshold = entries.some((e) =>
      e.result.findings.some(
        (f) => SEVERITY_RANK[f.severity as ThresholdSeverity] >= thresholdRank,
      ),
    );
    return hasAboveThreshold ? 1 : 0;
  }

  // Default: BLOCK → exit 1, ALLOW → exit 0
  const hasBlock = entries.some((e) => e.result.verdict === 'BLOCK');
  return hasBlock ? 1 : 0;
}

function printHelp(): void {
  const help = `
TPI Scanner CLI — Prompt injection detection for text and binary files

USAGE
  tpi-scan --file <path>                 Scan a single file
  tpi-scan --text <string>               Scan inline text
  tpi-scan --dir <path> [--glob <pat>]   Scan files in a directory
  tpi-scan --skill <path>                Scan a skill/agent file (Shingan trust score)
  echo "text" | tpi-scan                 Scan from stdin

OPTIONS
  -f, --file <path>          File to scan (auto-detects text vs binary)
  -t, --text <string>        Inline text to scan
  -d, --dir <path>           Directory to scan recursively
  -g, --glob <pattern>       File pattern for directory scan (default: *)
  -e, --engines <list>       Comma-separated engine names to use
      --format <fmt>         Output format: text|json|sarif|junit|csv (default: text)
  -o, --output <path>        Write output to file instead of stdout
      --skill <path>         Scan skill/agent file with Shingan (outputs trust score)
      --threshold <sev>      Exit 1 only if findings >= severity (INFO|WARNING|CRITICAL)
  -q, --quiet                Suppress output, return exit code only
  -s, --summary              Print one-line summary
  -v, --version              Print version
  -h, --help                 Show this help

EXIT CODES
  0    Verdict ALLOW (or no findings above threshold)
  1    Verdict BLOCK (or findings at/above threshold)
  2    Usage error or unexpected failure

EXAMPLES
  tpi-scan --file payload.txt
  tpi-scan --text "ignore previous instructions"
  tpi-scan --dir ./uploads --glob "*.html" --format sarif
  cat suspicious.md | tpi-scan --format json --output results.json
`;
  process.stdout.write(help.trim() + '\n');
}

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../../package.json') as { version: string };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// 7. MAIN ENTRY POINT
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let args: CliArgs;

  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.stderr.write('Run with --help for usage information.\n');
    process.exit(2);
    return; // unreachable but satisfies TS
  }

  // Handle --help
  if (args.help) {
    printHelp();
    process.exit(0);
    return;
  }

  // Handle --version
  if (args.version) {
    process.stdout.write(`tpi-scan ${getVersion()}\n`);
    process.exit(0);
    return;
  }

  // Handle --skill mode (Shingan trust score)
  if (args.skill) {
    try {
      const resolvedPath = resolve(args.skill);

      // Security: restrict to known text-based skill file extensions
      const SKILL_EXTS = new Set(['.txt', '.md', '.yaml', '.yml', '.json', '.ts', '.js']);
      const skillExt = extname(resolvedPath).toLowerCase();
      if (!SKILL_EXTS.has(skillExt)) {
        process.stderr.write(`Error: --skill only accepts skill definition files (${[...SKILL_EXTS].join(', ')}). Got: "${skillExt}"\n`);
        process.exit(2);
        return;
      }

      // Security: resolve symlinks and enforce CWD containment
      let realPath: string;
      try {
        realPath = realpathSync(resolvedPath);
      } catch {
        process.stderr.write(`Error: Cannot resolve path "${resolvedPath}"\n`);
        process.exit(2);
        return;
      }
      const allowRoot = resolve(process.env.TPI_SKILL_ROOT ?? '.');
      if (realPath !== allowRoot && !realPath.startsWith(allowRoot + '/')) {
        process.stderr.write(`Error: Path "${realPath}" is outside the allowed root\n`);
        process.exit(2);
        return;
      }

      const fileStat = statSync(realPath);
      if (fileStat.size > MAX_FILE_SIZE_BYTES) {
        process.stderr.write(`Error: File exceeds 50 MB limit\n`);
        process.exit(2);
        return;
      }
      const content = readFileSync(realPath, 'utf-8');
      const trustResult = computeTrustScore(content, realPath);

      if (args.quiet) {
        process.exit(trustResult.overall < 40 ? 1 : 0);
        return;
      }

      if (args.format === 'json') {
        const output = JSON.stringify(trustResult, null, 2);
        if (args.output) {
          writeFileSync(resolveOutputPath(args.output), output + '\n', 'utf-8');
        } else {
          process.stdout.write(output + '\n');
        }
      } else {
        const riskColor = trustResult.riskLevel === 'critical' || trustResult.riskLevel === 'high'
          ? 'CRITICAL' : trustResult.riskLevel === 'medium' ? 'WARNING' : 'SAFE';
        const lines = [
          `Shingan Trust Score: ${trustResult.overall}/100 [${riskColor}] (${trustResult.riskLevel})`,
          `Format: ${trustResult.format}`,
          `Findings: ${trustResult.findings.length}`,
        ];
        for (const [layer, deduction] of Object.entries(trustResult.layers)) {
          if (deduction > 0) {
            lines.push(`  ${layer}: -${deduction}`);
          }
        }
        const output = lines.join('\n');
        if (args.output) {
          writeFileSync(resolveOutputPath(args.output), output + '\n', 'utf-8');
        } else {
          process.stdout.write(output + '\n');
        }
      }

      process.exit(trustResult.overall < 40 ? 1 : 0);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error: ${message}\n`);
      process.exit(2);
      return;
    }
  }

  try {
    let entries: readonly ScanEntry[];

    if (args.file) {
      // Single file mode
      const entry = await scanFile(args.file, args.engines);
      entries = [entry];
    } else if (args.text !== undefined) {
      // Inline text mode
      const entry = scanText(args.text, args.engines);
      entries = [entry];
    } else if (args.dir) {
      // Directory mode
      entries = await scanDir(args.dir, args.glob, args.engines);
    } else {
      // Stdin mode
      const entry = await scanStdin(args.engines);
      entries = [entry];
    }

    // Compute exit code
    const exitCode = computeExitCode(entries, args.threshold);

    // Format and output
    if (!args.quiet) {
      const output = args.summary
        ? formatSummaryLine(entries)
        : formatOutput(entries, args.format);

      if (args.output) {
        writeFileSync(resolveOutputPath(args.output), output + '\n', 'utf-8');
      } else {
        process.stdout.write(output + '\n');
      }
    }

    process.exit(exitCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(2);
  }
}

main();
