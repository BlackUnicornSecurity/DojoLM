/**
 * H24.2: Dependency Auditor
 * Parse and audit dependency files for known vulnerabilities.
 * SEC-08: Input validation against command injection and URL-based requirements.
 */

import type {
  ParsedDependency,
  DependencyVulnerability,
  DependencyAuditResult,
  DependencyFormat,
} from './types.js';

// --- SEC-08: Security validation ---

/** Characters that indicate command injection attempts. */
const INJECTION_PATTERN = /[;|`]|\$\(/;

/** URL-based requirements (disallowed). */
const URL_PATTERN = /^(https?:\/\/|git(\+\w+)?:\/\/|svn:\/\/)/i;

/** Valid npm package name: scoped (@scope/name) or unscoped (alphanumeric, hyphens, dots, underscores). */
const NPM_NAME_PATTERN = /^(@[a-z0-9\-_.]+\/)?[a-z0-9\-_.]+$/i;

/** Valid Python package name: letters, digits, hyphens, underscores, dots. */
const PYPI_NAME_PATTERN = /^[a-zA-Z0-9][\w.\-]*$/;

/**
 * Validate a package name for injection attacks.
 * @throws Error if name contains injection characters or is a URL.
 */
function validatePackageName(name: string, source: string): void {
  if (INJECTION_PATTERN.test(name)) {
    throw new Error(
      `SEC-08: Rejected package name with injection characters: "${String(name).slice(0, 64)}" in ${source}`,
    );
  }
  if (URL_PATTERN.test(name)) {
    throw new Error(
      `SEC-08: Rejected URL-based requirement: "${String(name).slice(0, 64)}" in ${source}`,
    );
  }
}

// --- Known vulnerable packages (built-in database) ---

interface KnownVulnerability {
  readonly name: string;
  readonly maxSafeVersion: string;
  readonly severity: DependencyVulnerability['severity'];
  readonly cveId: string;
  readonly description: string;
  readonly fixVersion: string;
}

const KNOWN_VULNERABILITIES: readonly KnownVulnerability[] = [
  {
    name: 'lodash',
    maxSafeVersion: '4.17.20',
    severity: 'high',
    cveId: 'CVE-2021-23337',
    description: 'Prototype pollution in lodash',
    fixVersion: '4.17.21',
  },
  {
    name: 'minimist',
    maxSafeVersion: '1.2.5',
    severity: 'critical',
    cveId: 'CVE-2021-44906',
    description: 'Prototype pollution in minimist',
    fixVersion: '1.2.6',
  },
  {
    name: 'node-forge',
    maxSafeVersion: '1.2.99',
    severity: 'high',
    cveId: 'CVE-2022-24771',
    description: 'Signature verification bypass in node-forge',
    fixVersion: '1.3.0',
  },
  {
    name: 'requests',
    maxSafeVersion: '2.30.99',
    severity: 'medium',
    cveId: 'CVE-2023-32681',
    description: 'CRLF injection in requests',
    fixVersion: '2.31.0',
  },
  {
    name: 'flask',
    maxSafeVersion: '2.3.1',
    severity: 'medium',
    cveId: 'CVE-2023-30861',
    description: 'Cross-site scripting (XSS) in Flask',
    fixVersion: '2.3.2',
  },
];

// --- Simple semver comparison ---

/**
 * Parse a version string into numeric components.
 * Returns [major, minor, patch] or null if unparseable.
 */
function parseVersion(version: string): [number, number, number] | null {
  const cleaned = version.replace(/^[v=]/, '').trim();
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * Compare two semver version tuples.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareVersions(
  a: [number, number, number],
  b: [number, number, number],
): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Check if a version is less than or equal to a maximum version string.
 */
function isVersionLte(version: string, maxVersion: string): boolean {
  const a = parseVersion(version);
  const b = parseVersion(maxVersion);
  if (!a || !b) return false;
  return compareVersions(a, b) <= 0;
}

// --- Parsers ---

/**
 * Parse Python requirements.txt content.
 * Handles: name==version, name>=version, name~=version, name[extras]
 * SEC-08: Rejects injection characters and URL-based requirements.
 */
export function parseRequirementsTxt(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;
    // Skip option lines (-i, --index-url, etc.)
    if (line.startsWith('-')) continue;

    // SEC-08: Reject URL-based requirements
    validatePackageName(line.split(/[=<>~!;]/)[0].replace(/\[.*\]/, '').trim(), 'requirements.txt');

    // Parse: name[extras]specifier
    const match = line.match(/^([a-zA-Z0-9][\w.\-]*(?:\[[\w,.\-\s]*\])?)([=<>~!]+)(.+)$/);
    if (match) {
      const rawName = match[1].replace(/\[.*\]/, '').trim();
      validatePackageName(rawName, 'requirements.txt');
      if (!PYPI_NAME_PATTERN.test(rawName)) continue;

      deps.push({
        name: rawName,
        version: match[3].trim(),
        specifier: match[2].trim(),
        source: 'requirements.txt',
      });
    } else {
      // Name only (no version specifier)
      const rawName = line.replace(/\[.*\]/, '').trim();
      validatePackageName(rawName, 'requirements.txt');
      if (!PYPI_NAME_PATTERN.test(rawName)) continue;

      deps.push({
        name: rawName,
        version: null,
        specifier: null,
        source: 'requirements.txt',
      });
    }
  }

  return deps;
}

/**
 * Parse Node package.json content.
 * Extracts from dependencies + devDependencies.
 * SEC-08: Validates npm package name format.
 */
export function parsePackageJson(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid package.json: parse error');
  }

  const sections = ['dependencies', 'devDependencies'] as const;

  for (const section of sections) {
    const depMap = parsed[section];
    if (!depMap || typeof depMap !== 'object') continue;

    for (const [name, versionSpec] of Object.entries(
      depMap as Record<string, string>,
    )) {
      // SEC-08: Validate package name
      validatePackageName(name, 'package.json');
      if (!NPM_NAME_PATTERN.test(name)) {
        throw new Error(
          `SEC-08: Invalid npm package name: "${String(name).slice(0, 64)}"`,
        );
      }

      // Extract clean version from specifier (^1.2.3 → 1.2.3)
      const versionStr = typeof versionSpec === 'string' ? versionSpec : '';
      const cleanVersion = versionStr.replace(/^[\^~>=<\s]+/, '').trim() || null;
      const specifier = versionStr.match(/^([\^~>=<]+)/)?.[1] ?? null;

      deps.push({
        name,
        version: cleanVersion,
        specifier,
        source: 'package.json',
      });
    }
  }

  return deps;
}

/**
 * Parse pyproject.toml [project.dependencies] section.
 * Simple line-by-line parser for the dependencies array.
 * SEC-08: Same security validation as requirements.txt.
 */
export function parsePyprojectToml(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];

  // Find [project.dependencies] or [project] section with dependencies key
  const depsMatch = content.match(
    /\bdependencies\s*=\s*\[([\s\S]*?)\]/,
  );
  if (!depsMatch) return deps;

  const depsBlock = depsMatch[1];

  for (const rawLine of depsBlock.split('\n')) {
    // Extract quoted strings
    const quotedMatch = rawLine.match(/["']([^"']+)["']/);
    if (!quotedMatch) continue;

    const depStr = quotedMatch[1].trim();
    if (!depStr) continue;

    // Parse similarly to requirements.txt
    const match = depStr.match(/^([a-zA-Z0-9][\w.\-]*(?:\[[\w,.\-\s]*\])?)([=<>~!]+)(.+)$/);
    if (match) {
      const rawName = match[1].replace(/\[.*\]/, '').trim();
      validatePackageName(rawName, 'pyproject.toml');
      if (!PYPI_NAME_PATTERN.test(rawName)) continue;

      deps.push({
        name: rawName,
        version: match[3].trim(),
        specifier: match[2].trim(),
        source: 'pyproject.toml',
      });
    } else {
      const rawName = depStr.replace(/\[.*\]/, '').trim();
      validatePackageName(rawName, 'pyproject.toml');
      if (!PYPI_NAME_PATTERN.test(rawName)) continue;

      deps.push({
        name: rawName,
        version: null,
        specifier: null,
        source: 'pyproject.toml',
      });
    }
  }

  return deps;
}

/**
 * Check parsed dependencies against the known vulnerability database.
 * Returns any matching vulnerabilities.
 */
export function checkVulnerabilities(
  dependencies: ParsedDependency[],
): DependencyVulnerability[] {
  const vulns: DependencyVulnerability[] = [];

  for (const dep of dependencies) {
    if (!dep.version) continue;

    for (const known of KNOWN_VULNERABILITIES) {
      if (dep.name.toLowerCase() !== known.name.toLowerCase()) continue;

      if (isVersionLte(dep.version, known.maxSafeVersion)) {
        vulns.push({
          dependencyName: dep.name,
          version: dep.version,
          severity: known.severity,
          cveId: known.cveId,
          description: known.description,
          fixVersion: known.fixVersion,
        });
      }
    }
  }

  return vulns;
}

/**
 * Audit a dependency file: parse it and check for vulnerabilities.
 */
export function auditDependencyFile(
  content: string,
  format: DependencyFormat,
): DependencyAuditResult {
  let dependencies: ParsedDependency[];

  switch (format) {
    case 'requirements.txt':
      dependencies = parseRequirementsTxt(content);
      break;
    case 'package.json':
      dependencies = parsePackageJson(content);
      break;
    case 'pyproject.toml':
      dependencies = parsePyprojectToml(content);
      break;
    default:
      throw new Error(`Unsupported format: ${String(format)}`);
  }

  const vulnerabilities = checkVulnerabilities(dependencies);

  return {
    source: format,
    format,
    dependencies,
    vulnerabilities,
  };
}
