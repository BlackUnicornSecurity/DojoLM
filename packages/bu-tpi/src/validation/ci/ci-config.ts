/**
 * KATANA CI Configuration Helper (K6.2)
 *
 * Utilities for CI pipeline integration:
 * - Detect changed scanner modules from git diff
 * - Build CLI commands for CI runners
 * - Parse and map exit codes
 *
 * ISO 17025 Clause: 7.2.2
 */

// ---------------------------------------------------------------------------
// Exit Codes
// ---------------------------------------------------------------------------

export const CI_EXIT_CODES = {
  PASS: 0,
  FAIL: 1,
  CALIBRATION_FAIL: 2,
  INTEGRITY_FAIL: 3,
} as const;

export type CIExitCode = (typeof CI_EXIT_CODES)[keyof typeof CI_EXIT_CODES];

const EXIT_CODE_DESCRIPTIONS: Readonly<Record<number, string>> = {
  [CI_EXIT_CODES.PASS]: 'All validations passed — zero FP/FN detected',
  [CI_EXIT_CODES.FAIL]: 'Validation failed — false positives or false negatives detected',
  [CI_EXIT_CODES.CALIBRATION_FAIL]: 'Calibration check failed — reference set mismatch',
  [CI_EXIT_CODES.INTEGRITY_FAIL]: 'Integrity check failed — HMAC or signature verification error',
};

// ---------------------------------------------------------------------------
// Changed Module Detection
// ---------------------------------------------------------------------------

/**
 * Module path patterns that map file paths to module IDs.
 * Each entry maps a directory/file pattern to the corresponding module ID.
 */
const MODULE_PATH_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/src\/modules\/([a-zA-Z0-9_-]+)/, '$1'],
  [/src\/scanners\/([a-zA-Z0-9_-]+)/, '$1'],
  [/src\/detection\/([a-zA-Z0-9_-]+)/, '$1'],
  [/src\/rules\/([a-zA-Z0-9_-]+)/, '$1'],
] as const;

/**
 * Parse git diff output to find changed scanner module files.
 *
 * @param diffOutput - Raw output from `git diff --name-only`
 * @returns Array of unique module IDs that have changes
 */
export function detectChangedModules(diffOutput: string): readonly string[] {
  if (!diffOutput || diffOutput.trim().length === 0) {
    return [];
  }

  const lines = diffOutput
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const moduleIds = new Set<string>();

  for (const line of lines) {
    for (const [pattern, replacement] of MODULE_PATH_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Extract the module ID from the capture group
        const moduleId = match[1];
        if (moduleId) {
          // Strip file extensions and nested paths — keep only the directory name
          const cleanId = moduleId.split('/')[0].replace(/\.(ts|js|json)$/, '');
          moduleIds.add(cleanId);
        }
      }
    }
  }

  // Return sorted for deterministic output
  return [...moduleIds].sort();
}

// ---------------------------------------------------------------------------
// CI Command Builder
// ---------------------------------------------------------------------------

export interface CIValidationOptions {
  /** Validation mode */
  readonly mode: 'validate' | 'calibrate';
  /** Specific modules to validate (empty = all) */
  readonly modules?: readonly string[];
  /** Output format */
  readonly outputFormat?: 'json' | 'text';
  /** Additional CLI flags */
  readonly extraFlags?: readonly string[];
}

/**
 * Construct the CLI command string for CI execution.
 *
 * @param options - Validation configuration
 * @returns Complete CLI command string
 */
const SAFE_MODULE_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function buildCIValidationCommand(options: CIValidationOptions): string {
  // Validate module names to prevent command injection
  if (options.modules) {
    for (const mod of options.modules) {
      if (!SAFE_MODULE_PATTERN.test(mod)) {
        throw new Error(`Unsafe module name: "${mod}" — must match ${SAFE_MODULE_PATTERN}`);
      }
    }
  }

  const parts: readonly string[] = [
    'npx',
    'katana',
    options.mode,
    ...(options.modules && options.modules.length > 0
      ? ['--modules', options.modules.join(',')]
      : options.mode === 'validate'
        ? ['--modules', 'all']
        : []),
    ...(options.outputFormat
      ? ['--output', options.outputFormat]
      : []),
    ...(options.extraFlags ?? []),
  ];

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Exit Code Parser
// ---------------------------------------------------------------------------

/**
 * Map a CI exit code to a human-readable status description.
 *
 * @param code - Process exit code
 * @returns Human-readable status string
 */
export function parseCIExitCode(code: number): string {
  const description = EXIT_CODE_DESCRIPTIONS[code];
  if (description !== undefined) {
    return description;
  }
  return `Unknown exit code: ${code}`;
}
