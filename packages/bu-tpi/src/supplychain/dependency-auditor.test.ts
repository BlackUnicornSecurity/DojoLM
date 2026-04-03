import { describe, it, expect } from 'vitest';
import {
  parseRequirementsTxt,
  parsePackageJson,
  parsePyprojectToml,
  checkVulnerabilities,
  auditDependencyFile,
} from './dependency-auditor.js';

describe('parseRequirementsTxt', () => {
  it('parses pinned dependencies', () => {
    const content = 'flask==2.3.0\nrequests==2.28.0';
    const deps = parseRequirementsTxt(content);
    expect(deps).toHaveLength(2);
    expect(deps[0].name).toBe('flask');
    expect(deps[0].version).toBe('2.3.0');
    expect(deps[0].specifier).toBe('==');
  });

  it('skips comments and empty lines', () => {
    const content = '# this is a comment\n\nflask==2.3.0\n-i https://pypi.org/simple';
    const deps = parseRequirementsTxt(content);
    expect(deps).toHaveLength(1);
  });

  it('parses name-only dependencies', () => {
    const content = 'requests';
    const deps = parseRequirementsTxt(content);
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('requests');
    expect(deps[0].version).toBeNull();
  });

  it('rejects injection characters (SEC-08)', () => {
    expect(() => parseRequirementsTxt('flask;rm -rf /')).toThrow(/SEC-08/);
  });

  it('rejects URL-based requirements (SEC-08)', () => {
    expect(() => parseRequirementsTxt('https://evil.com/package.tar.gz')).toThrow(/SEC-08/);
  });
});

describe('parsePackageJson', () => {
  it('parses dependencies and devDependencies', () => {
    const content = JSON.stringify({
      dependencies: { lodash: '^4.17.20' },
      devDependencies: { vitest: '^1.0.0' },
    });
    const deps = parsePackageJson(content);
    expect(deps).toHaveLength(2);
    expect(deps[0].name).toBe('lodash');
    expect(deps[0].version).toBe('4.17.20');
  });

  it('throws on invalid JSON', () => {
    expect(() => parsePackageJson('not json')).toThrow(/parse error/);
  });

  it('handles empty dependencies', () => {
    const content = JSON.stringify({ name: 'test' });
    const deps = parsePackageJson(content);
    expect(deps).toHaveLength(0);
  });
});

describe('parsePyprojectToml', () => {
  it('parses dependencies array', () => {
    const content = `[project]\ndependencies = [\n  "flask>=2.3.0",\n  "requests==2.28.0",\n]`;
    const deps = parsePyprojectToml(content);
    expect(deps).toHaveLength(2);
    expect(deps[0].name).toBe('flask');
  });

  it('returns empty for missing dependencies section', () => {
    const content = '[project]\nname = "test"';
    expect(parsePyprojectToml(content)).toHaveLength(0);
  });
});

describe('checkVulnerabilities', () => {
  it('finds known vulnerability in lodash 4.17.20', () => {
    const deps = [{ name: 'lodash', version: '4.17.20', specifier: '==', source: 'test' }];
    const vulns = checkVulnerabilities(deps);
    expect(vulns).toHaveLength(1);
    expect(vulns[0].cveId).toBe('CVE-2021-23337');
  });

  it('returns empty for safe versions', () => {
    const deps = [{ name: 'lodash', version: '4.17.21', specifier: '==', source: 'test' }];
    const vulns = checkVulnerabilities(deps);
    expect(vulns).toHaveLength(0);
  });

  it('skips dependencies without versions', () => {
    const deps = [{ name: 'lodash', version: null, specifier: null, source: 'test' }];
    expect(checkVulnerabilities(deps)).toHaveLength(0);
  });
});

describe('auditDependencyFile', () => {
  it('audits a requirements.txt file end to end', () => {
    const result = auditDependencyFile('flask==2.3.0\nrequests==2.28.0', 'requirements.txt');
    expect(result.dependencies).toHaveLength(2);
    expect(result.format).toBe('requirements.txt');
    // flask 2.3.0 <= 2.3.1, so vulnerable
    expect(result.vulnerabilities.length).toBeGreaterThanOrEqual(1);
  });

  it('throws for unsupported format', () => {
    expect(() => auditDependencyFile('', 'Cargo.toml' as never)).toThrow(/Unsupported format/);
  });
});
