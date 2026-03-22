/**
 * KATANA Reproducibility Study (K5.2)
 *
 * Cross-environment validation to prove results are consistent
 * across different OS, architecture, and Node.js versions.
 *
 * Environment matrix:
 * - macOS arm64, Linux x64, Linux arm64
 * - Node.js LTS, current, previous LTS
 *
 * ISO 17025 Clause: 7.2.2
 */

import {
  SCHEMA_VERSION,
  type ValidationResult,
  type ReproducibilityResult,
} from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnvironmentLabel {
  readonly label: string;
  readonly os: string;
  readonly arch: string;
  readonly node_version: string;
}

export interface EnvironmentRunResult {
  readonly environment: EnvironmentLabel;
  readonly results: readonly ValidationResult[];
}

export interface ReproducibilityOptions {
  /** Module being tested */
  readonly moduleId: string;
}

// ---------------------------------------------------------------------------
// Environment Matrix Definition
// ---------------------------------------------------------------------------

export const ENVIRONMENT_MATRIX: readonly EnvironmentLabel[] = [
  { label: 'macos-arm64-lts', os: 'darwin', arch: 'arm64', node_version: '22.x' },
  { label: 'macos-arm64-current', os: 'darwin', arch: 'arm64', node_version: '23.x' },
  { label: 'macos-arm64-prev-lts', os: 'darwin', arch: 'arm64', node_version: '20.x' },
  { label: 'linux-x64-lts', os: 'linux', arch: 'x64', node_version: '22.x' },
  { label: 'linux-x64-current', os: 'linux', arch: 'x64', node_version: '23.x' },
  { label: 'linux-x64-prev-lts', os: 'linux', arch: 'x64', node_version: '20.x' },
  { label: 'linux-arm64-lts', os: 'linux', arch: 'arm64', node_version: '22.x' },
  { label: 'linux-arm64-current', os: 'linux', arch: 'arm64', node_version: '23.x' },
  { label: 'linux-arm64-prev-lts', os: 'linux', arch: 'arm64', node_version: '20.x' },
] as const;

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Compare results across environments for a single module.
 * Returns disagreement details for any cross-env differences.
 */
function compareEnvironmentResults(
  envResults: readonly EnvironmentRunResult[],
): { sample_id: string; field: string; env_values: Record<string, string> }[] {
  if (envResults.length < 2) return [];

  const disagreements: { sample_id: string; field: string; env_values: Record<string, string> }[] = [];

  const baseline = envResults[0];
  const baselineMap = new Map(baseline.results.map(r => [r.sample_id, r]));

  // Collect all sample IDs across all environments
  const allSampleIds = new Set<string>();
  for (const envResult of envResults) {
    for (const result of envResult.results) {
      allSampleIds.add(result.sample_id);
    }
  }

  for (const sampleId of allSampleIds) {
    const baseResult = baselineMap.get(sampleId);

    // Check verdict agreement
    // Pre-build Maps per environment for O(1) lookup
    const envMaps = envResults.map(envResult => ({
      label: envResult.environment.label,
      map: new Map(envResult.results.map(r => [r.sample_id, r])),
    }));

    const verdicts: Record<string, string> = {};
    let verdictDisagreement = false;
    for (const { label, map } of envMaps) {
      const result = map.get(sampleId);
      const verdict = result?.actual_verdict ?? 'missing';
      verdicts[label] = verdict;
      if (baseResult && verdict !== baseResult.actual_verdict) {
        verdictDisagreement = true;
      }
      if (!baseResult && verdict !== 'missing') {
        verdictDisagreement = true;
      }
    }
    if (verdictDisagreement) {
      disagreements.push({ sample_id: sampleId, field: 'actual_verdict', env_values: verdicts });
    }

    // Check severity agreement
    const severities: Record<string, string> = {};
    let severityDisagreement = false;
    for (const { label, map } of envMaps) {
      const result = map.get(sampleId);
      const sev = result?.actual_severity ?? 'null';
      severities[label] = sev;
      if (baseResult && sev !== (baseResult.actual_severity ?? 'null')) {
        severityDisagreement = true;
      }
    }
    if (severityDisagreement && baseResult) {
      disagreements.push({ sample_id: sampleId, field: 'actual_severity', env_values: severities });
    }

    // Check categories agreement
    const categories: Record<string, string> = {};
    let catDisagreement = false;
    for (const { label, map } of envMaps) {
      const result = map.get(sampleId);
      const cats = result ? [...result.actual_categories].sort().join(',') : 'missing';
      categories[label] = cats;
      if (baseResult) {
        const baseCats = [...baseResult.actual_categories].sort().join(',');
        if (cats !== baseCats) catDisagreement = true;
      }
    }
    if (catDisagreement && baseResult) {
      disagreements.push({ sample_id: sampleId, field: 'actual_categories', env_values: categories });
    }

    // Check findings count agreement
    const counts: Record<string, string> = {};
    let countDisagreement = false;
    for (const { label, map } of envMaps) {
      const result = map.get(sampleId);
      const count = result ? String(result.actual_findings_count) : 'missing';
      counts[label] = count;
      if (baseResult && count !== String(baseResult.actual_findings_count)) {
        countDisagreement = true;
      }
    }
    if (countDisagreement && baseResult) {
      disagreements.push({ sample_id: sampleId, field: 'actual_findings_count', env_values: counts });
    }
  }

  return disagreements;
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------

/**
 * Analyze reproducibility from pre-collected environment run results.
 *
 * @param moduleId - Module under test
 * @param envResults - Results from each environment
 * @returns ReproducibilityResult with cross-env comparison evidence
 */
export function analyzeReproducibility(
  moduleId: string,
  envResults: readonly EnvironmentRunResult[],
): ReproducibilityResult {
  if (!moduleId || moduleId.length === 0) {
    throw new Error('moduleId must be non-empty');
  }
  if (envResults.length < 2) {
    throw new Error(`Need at least 2 environment results, got ${envResults.length}`);
  }

  const disagreements = compareEnvironmentResults(envResults);
  const crossEnvAgreement = disagreements.length === 0;

  return {
    schema_version: SCHEMA_VERSION,
    module_id: moduleId,
    environments: envResults.map(e => ({ ...e.environment })),
    cross_env_agreement: crossEnvAgreement,
    disagreement_count: disagreements.length,
    disagreement_samples: disagreements,
    verdict: crossEnvAgreement ? 'PASS' : 'FAIL',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Analyze reproducibility for multiple modules.
 */
export function analyzeAllReproducibility(
  modules: ReadonlyMap<string, readonly EnvironmentRunResult[]>,
): Map<string, ReproducibilityResult> {
  const results = new Map<string, ReproducibilityResult>();

  for (const [moduleId, envResults] of modules) {
    results.set(moduleId, analyzeReproducibility(moduleId, envResults));
  }

  return results;
}

/**
 * Check if all reproducibility results pass.
 */
export function allReproducibilityPassed(
  results: ReadonlyMap<string, ReproducibilityResult>,
): boolean {
  if (results.size === 0) return false;
  for (const result of results.values()) {
    if (result.verdict !== 'PASS') return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Dockerfile Generation (K5.2)
// ---------------------------------------------------------------------------

/**
 * Generate a Dockerfile for a specific environment target.
 */
export function generateDockerfile(env: EnvironmentLabel): string {
  // Sanitize label to prevent injection in Dockerfile
  if (!/^[a-z0-9][a-z0-9\-]*$/.test(env.label)) {
    throw new Error(`Invalid environment label: ${env.label} — must match ^[a-z0-9][a-z0-9\\-]*$`);
  }
  const nodeTag = env.node_version.replace('.x', '');
  const platform = env.arch === 'arm64' ? 'linux/arm64' : 'linux/amd64';

  return `# KATANA Reproducibility — ${env.label}
# Generated for cross-environment validation (ISO 17025, Clause 7.2.2)
FROM --platform=${platform} node:${nodeTag}-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN npm run build --workspace=packages/bu-tpi

# Run validation with environment label
ENV KATANA_ENV_LABEL="${env.label}"
CMD ["npx", "katana", "validate", "--modules", "all"]
`;
}

/**
 * Generate CI workflow YAML for cross-environment reproducibility.
 */
export function generateCIWorkflow(): string {
  return `# KATANA Reproducibility CI Workflow
# ISO 17025, Clause 7.2.2 — Cross-environment validation
name: katana-reproducibility

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * 0'  # Weekly Sunday 2am

jobs:
  validate:
    strategy:
      matrix:
        include:
          - os: macos-latest
            arch: arm64
            node: 22
            label: macos-arm64-lts
          - os: macos-latest
            arch: arm64
            node: 23
            label: macos-arm64-current
          - os: macos-latest
            arch: arm64
            node: 20
            label: macos-arm64-prev-lts
          - os: ubuntu-latest
            arch: x64
            node: 22
            label: linux-x64-lts
          - os: ubuntu-latest
            arch: x64
            node: 23
            label: linux-x64-current
          - os: ubuntu-latest
            arch: x64
            node: 20
            label: linux-x64-prev-lts
    runs-on: \${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
      - run: npm ci
      - run: npm run build --workspace=packages/bu-tpi
      - name: Run KATANA validation
        env:
          KATANA_ENV_LABEL: \${{ matrix.label }}
        run: npx katana validate --modules all --output json
      - uses: actions/upload-artifact@v4
        with:
          name: katana-results-\${{ matrix.label }}
          path: packages/bu-tpi/validation/reports/runs/

  compare:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          path: validation-results/
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build --workspace=packages/bu-tpi
      - name: Compare cross-environment results
        run: npx katana reproducibility --results-dir validation-results/
`;
}
