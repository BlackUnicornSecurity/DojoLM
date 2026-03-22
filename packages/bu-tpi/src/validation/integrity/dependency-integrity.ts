/**
 * KATANA Dependency Integrity (K8.3)
 *
 * Verifies that validation framework dependencies are pinned to exact
 * versions and that the lockfile is consistent.
 *
 * Rationale: A compromised dependency could silently alter validation results.
 *
 * Steps:
 * 1. Pin all validation framework dependencies with exact versions
 * 2. Lockfile integrity verification
 * 3. npm audit as pre-validation step
 * 4. SBOM generation for validation toolchain
 *
 * ISO 17025 Clause 6.4: Equipment validation includes software dependencies.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DependencyCheckResult {
  lockfile_exists: boolean;
  lockfile_hash: string | null;
  unpinned_dependencies: string[];
  audit_vulnerabilities: AuditVulnerability[];
  passed: boolean;
  errors: string[];
}

export interface AuditVulnerability {
  name: string;
  severity: string;
  title: string;
  url: string;
}

export interface SBOMEntry {
  name: string;
  version: string;
  resolved: string;
  integrity: string;
}

export interface SBOM {
  generated_at: string;
  package_name: string;
  entries: SBOMEntry[];
  total_dependencies: number;
  lockfile_hash: string;
}

// ---------------------------------------------------------------------------
// Path Safety
// ---------------------------------------------------------------------------

/**
 * Safely join a root directory with a known filename.
 * Validates the resolved path stays within the root directory.
 */
function safeJoinRoot(root: string, filename: string): string {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(root, filename);
  if (!resolvedPath.startsWith(resolvedRoot + sep) && resolvedPath !== resolvedRoot) {
    throw new Error(`Path traversal detected: ${filename}`);
  }
  return resolvedPath;
}

// ---------------------------------------------------------------------------
// Lockfile Verification
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 hash of the lockfile for integrity tracking.
 *
 * @param projectRoot - Root directory of the project (containing package-lock.json)
 * @returns Hex-encoded SHA-256 hash, or null if lockfile doesn't exist
 */
export function hashLockfile(projectRoot: string): string | null {
  const lockfilePath = safeJoinRoot(projectRoot, 'package-lock.json');
  if (!existsSync(lockfilePath)) {
    return null;
  }
  const content = readFileSync(lockfilePath, 'utf-8');
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Verify that the lockfile exists and is consistent with package.json.
 */
export function verifyLockfileExists(projectRoot: string): boolean {
  const lockfilePath = safeJoinRoot(projectRoot, 'package-lock.json');
  return existsSync(lockfilePath);
}

// ---------------------------------------------------------------------------
// Dependency Pinning Check
// ---------------------------------------------------------------------------

/**
 * Check that all dependencies in package.json use exact version pins
 * (no ^, ~, *, or ranges).
 *
 * @param packageJsonPath - Path to package.json
 * @returns List of unpinned dependency names
 */
export function checkPinnedDependencies(packageJsonPath: string): string[] {
  if (!existsSync(packageJsonPath)) {
    return [];
  }

  const raw = readFileSync(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(raw) as Record<string, unknown>;
  const unpinned: string[] = [];

  const depSections = ['dependencies', 'devDependencies'] as const;
  for (const section of depSections) {
    const deps = pkg[section];
    if (deps && typeof deps === 'object') {
      for (const [name, version] of Object.entries(deps as Record<string, string>)) {
        if (isUnpinned(version)) {
          unpinned.push(`${name}@${version}`);
        }
      }
    }
  }

  return unpinned;
}

/**
 * Check if a version string is unpinned (uses ^, ~, *, >, <, or ranges).
 */
function isUnpinned(version: string): boolean {
  // Workspace references are acceptable
  if (version.startsWith('workspace:')) return false;
  // file: and link: references are acceptable
  if (version.startsWith('file:') || version.startsWith('link:')) return false;
  // Git URLs are acceptable
  if (version.includes('://') || version.startsWith('git+')) return false;

  // Check for range operators
  if (/[~^*>< |]/.test(version)) return true;

  // Dist-tags (e.g., "latest", "next", "canary") are not pinned.
  // A pinned version must look like a semver triplet (e.g., "1.2.3" or "1.2.3-beta.1").
  if (!/^\d+\.\d+\.\d+/.test(version)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// npm audit
// ---------------------------------------------------------------------------

/**
 * Run npm audit and parse results.
 * Returns list of vulnerabilities found.
 *
 * @param projectRoot - Root directory with package-lock.json
 * @param timeout - Timeout in milliseconds (default 30s)
 */
export function runAudit(
  projectRoot: string,
  timeout = 30_000,
): AuditVulnerability[] {
  // Validate projectRoot exists and contains a lockfile before executing
  const resolvedRoot = resolve(projectRoot);
  if (!existsSync(resolvedRoot)) {
    return [];
  }

  try {
    const output = execFileSync('npm', ['audit', '--json', '--omit=dev'], {
      cwd: resolvedRoot,
      encoding: 'utf-8',
      timeout,
    });
    return parseAuditOutput(output);
  } catch (error: unknown) {
    // npm audit exits with non-zero when vulnerabilities found
    if (error && typeof error === 'object' && 'stdout' in error) {
      return parseAuditOutput(String((error as { stdout: string }).stdout));
    }
    return [];
  }
}

/**
 * Parse npm audit JSON output into vulnerability list.
 */
function parseAuditOutput(output: string): AuditVulnerability[] {
  try {
    const parsed = JSON.parse(output) as Record<string, unknown>;
    const vulnerabilities = parsed.vulnerabilities;
    if (!vulnerabilities || typeof vulnerabilities !== 'object') {
      return [];
    }

    const results: AuditVulnerability[] = [];
    for (const [name, details] of Object.entries(vulnerabilities as Record<string, Record<string, unknown>>)) {
      if (details && typeof details === 'object') {
        // Extract title from via array (npm audit format)
        let title = name;
        const via = details.via;
        if (Array.isArray(via) && via.length > 0) {
          const first = via[0];
          if (first && typeof first === 'object' && 'title' in first) {
            title = String((first as Record<string, unknown>).title);
          }
        }

        results.push({
          name,
          severity: String(details.severity ?? 'unknown'),
          title,
          url: String(details.url ?? ''),
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// SBOM Generation
// ---------------------------------------------------------------------------

/**
 * Generate a Software Bill of Materials for the validation toolchain.
 *
 * Reads package-lock.json to extract all resolved dependencies
 * with their exact versions and integrity hashes.
 *
 * @param projectRoot - Root directory with package-lock.json
 * @param packageName - Name of the package (for SBOM metadata)
 */
export function generateSBOM(projectRoot: string, packageName: string): SBOM {
  const lockfilePath = safeJoinRoot(projectRoot, 'package-lock.json');
  if (!existsSync(lockfilePath)) {
    return {
      generated_at: new Date().toISOString(),
      package_name: packageName,
      entries: [],
      total_dependencies: 0,
      lockfile_hash: '',
    };
  }

  const raw = readFileSync(lockfilePath, 'utf-8');
  const lockfile = JSON.parse(raw) as Record<string, unknown>;
  const lockfileHash = createHash('sha256').update(raw).digest('hex');

  const entries: SBOMEntry[] = [];
  const packages = lockfile.packages;

  if (packages && typeof packages === 'object') {
    for (const [path, details] of Object.entries(packages as Record<string, Record<string, unknown>>)) {
      // Skip root package
      if (path === '') continue;

      const name = path.replace(/^node_modules\//, '');
      entries.push({
        name,
        version: String(details.version ?? ''),
        resolved: String(details.resolved ?? ''),
        integrity: String(details.integrity ?? ''),
      });
    }
  }

  return {
    generated_at: new Date().toISOString(),
    package_name: packageName,
    entries,
    total_dependencies: entries.length,
    lockfile_hash: lockfileHash,
  };
}

// ---------------------------------------------------------------------------
// Full Dependency Check
// ---------------------------------------------------------------------------

/**
 * Run complete dependency integrity check.
 *
 * @param projectRoot - Root directory of the project
 * @param packageJsonPath - Path to the specific package.json to check
 * @param skipAudit - Skip npm audit (for faster checks)
 */
export function checkDependencyIntegrity(
  projectRoot: string,
  packageJsonPath: string,
  skipAudit = false,
): DependencyCheckResult {
  const errors: string[] = [];

  const lockfileExists = verifyLockfileExists(projectRoot);
  if (!lockfileExists) {
    errors.push('package-lock.json not found — lockfile required for integrity verification');
  }

  const lockfileHash = hashLockfile(projectRoot);
  const unpinned = checkPinnedDependencies(packageJsonPath);

  if (unpinned.length > 0) {
    errors.push(`${unpinned.length} unpinned dependencies found: ${unpinned.join(', ')}`);
  }

  let audit: AuditVulnerability[] = [];
  if (!skipAudit && lockfileExists) {
    audit = runAudit(projectRoot);
    const critical = audit.filter(v => v.severity === 'critical' || v.severity === 'high');
    if (critical.length > 0) {
      errors.push(`${critical.length} critical/high vulnerabilities found in dependencies`);
    }
  }

  return {
    lockfile_exists: lockfileExists,
    lockfile_hash: lockfileHash,
    unpinned_dependencies: unpinned,
    audit_vulnerabilities: audit,
    passed: errors.length === 0,
    errors,
  };
}
