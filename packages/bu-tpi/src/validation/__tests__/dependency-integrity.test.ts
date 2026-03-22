/**
 * Tests for KATANA Dependency Integrity (K8.3)
 *
 * Lockfile verification, dependency pinning, and SBOM generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import {
  hashLockfile,
  verifyLockfileExists,
  checkPinnedDependencies,
  generateSBOM,
  checkDependencyIntegrity,
} from '../integrity/dependency-integrity.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_DIR = join(process.cwd(), '.test-dep-integrity');

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

function writeTestFile(name: string, content: string): string {
  const path = join(TEST_DIR, name);
  writeFileSync(path, content, 'utf-8');
  return path;
}

// ---------------------------------------------------------------------------
// Lockfile Verification
// ---------------------------------------------------------------------------

describe('hashLockfile', () => {
  it('returns SHA-256 hash of lockfile', () => {
    writeTestFile('package-lock.json', '{"lockfileVersion":3}');
    const hash = hashLockfile(TEST_DIR);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns null when lockfile missing', () => {
    const hash = hashLockfile(TEST_DIR);
    expect(hash).toBeNull();
  });

  it('produces different hashes for different content', () => {
    writeTestFile('package-lock.json', '{"v":1}');
    const hash1 = hashLockfile(TEST_DIR);

    writeTestFile('package-lock.json', '{"v":2}');
    const hash2 = hashLockfile(TEST_DIR);

    expect(hash1).not.toBe(hash2);
  });

  it('produces same hash for same content', () => {
    writeTestFile('package-lock.json', '{"v":1}');
    const hash1 = hashLockfile(TEST_DIR);
    const hash2 = hashLockfile(TEST_DIR);
    expect(hash1).toBe(hash2);
  });
});

describe('verifyLockfileExists', () => {
  it('returns true when lockfile exists', () => {
    writeTestFile('package-lock.json', '{}');
    expect(verifyLockfileExists(TEST_DIR)).toBe(true);
  });

  it('returns false when lockfile missing', () => {
    expect(verifyLockfileExists(TEST_DIR)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dependency Pinning
// ---------------------------------------------------------------------------

describe('checkPinnedDependencies', () => {
  it('returns empty for exact versions', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: {
        zod: '3.24.4',
        typescript: '5.4.0',
      },
    }));
    expect(checkPinnedDependencies(path)).toEqual([]);
  });

  it('detects caret ranges', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '^3.24.4' },
    }));
    const unpinned = checkPinnedDependencies(path);
    expect(unpinned).toEqual(['zod@^3.24.4']);
  });

  it('detects tilde ranges', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '~3.24.4' },
    }));
    const unpinned = checkPinnedDependencies(path);
    expect(unpinned).toEqual(['zod@~3.24.4']);
  });

  it('detects wildcard versions', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '*' },
    }));
    expect(checkPinnedDependencies(path)).toEqual(['zod@*']);
  });

  it('detects range operators', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '>=3.0.0' },
    }));
    expect(checkPinnedDependencies(path)).toEqual(['zod@>=3.0.0']);
  });

  it('allows workspace references', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { 'bu-tpi': 'workspace:*' },
    }));
    expect(checkPinnedDependencies(path)).toEqual([]);
  });

  it('allows file references', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { local: 'file:../local' },
    }));
    expect(checkPinnedDependencies(path)).toEqual([]);
  });

  it('checks devDependencies too', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '3.24.4' },
      devDependencies: { vitest: '^2.0.0' },
    }));
    expect(checkPinnedDependencies(path)).toEqual(['vitest@^2.0.0']);
  });

  it('returns empty for non-existent file', () => {
    expect(checkPinnedDependencies('/nonexistent/package.json')).toEqual([]);
  });

  it('detects OR ranges', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '3.0.0 || 4.0.0' },
    }));
    expect(checkPinnedDependencies(path).length).toBe(1);
  });

  it('detects dist-tags as unpinned', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: 'latest', vitest: 'next', foo: 'canary' },
    }));
    const unpinned = checkPinnedDependencies(path);
    expect(unpinned).toHaveLength(3);
    expect(unpinned).toContain('zod@latest');
    expect(unpinned).toContain('vitest@next');
    expect(unpinned).toContain('foo@canary');
  });

  it('allows pre-release pinned versions', () => {
    const path = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '3.24.4-beta.1' },
    }));
    expect(checkPinnedDependencies(path)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SBOM Generation
// ---------------------------------------------------------------------------

describe('generateSBOM', () => {
  it('generates SBOM from lockfile', () => {
    writeTestFile('package-lock.json', JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': { name: 'test-pkg', version: '1.0.0' },
        'node_modules/zod': {
          version: '3.24.4',
          resolved: 'https://registry.npmjs.org/zod/-/zod-3.24.4.tgz',
          integrity: 'sha512-abc123',
        },
      },
    }));

    const sbom = generateSBOM(TEST_DIR, 'test-pkg');
    expect(sbom.package_name).toBe('test-pkg');
    expect(sbom.total_dependencies).toBe(1);
    expect(sbom.entries[0].name).toBe('zod');
    expect(sbom.entries[0].version).toBe('3.24.4');
    expect(sbom.lockfile_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(sbom.generated_at).toBeTruthy();
  });

  it('returns empty SBOM when no lockfile', () => {
    const sbom = generateSBOM(TEST_DIR, 'missing');
    expect(sbom.total_dependencies).toBe(0);
    expect(sbom.entries).toEqual([]);
  });

  it('skips root package entry', () => {
    writeTestFile('package-lock.json', JSON.stringify({
      packages: {
        '': { name: 'root', version: '1.0.0' },
      },
    }));

    const sbom = generateSBOM(TEST_DIR, 'root');
    expect(sbom.total_dependencies).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Full Dependency Check
// ---------------------------------------------------------------------------

describe('checkDependencyIntegrity', () => {
  it('passes when lockfile exists and all deps pinned', () => {
    writeTestFile('package-lock.json', '{"lockfileVersion":3}');
    const pkgPath = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '3.24.4' },
    }));

    const result = checkDependencyIntegrity(TEST_DIR, pkgPath, true);
    expect(result.passed).toBe(true);
    expect(result.lockfile_exists).toBe(true);
    expect(result.lockfile_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.unpinned_dependencies).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('fails when lockfile missing', () => {
    const pkgPath = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '3.24.4' },
    }));

    const result = checkDependencyIntegrity(TEST_DIR, pkgPath, true);
    expect(result.passed).toBe(false);
    expect(result.lockfile_exists).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('fails when dependencies unpinned', () => {
    writeTestFile('package-lock.json', '{}');
    const pkgPath = writeTestFile('package.json', JSON.stringify({
      dependencies: { zod: '^3.24.4' },
    }));

    const result = checkDependencyIntegrity(TEST_DIR, pkgPath, true);
    expect(result.passed).toBe(false);
    expect(result.unpinned_dependencies).toEqual(['zod@^3.24.4']);
  });
});
