/**
 * H10.1: Evidence mapping verification tests
 * Validates that all mapped evidence references point to existing test files,
 * mapped controls exist in frameworks, and deduplication works correctly.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ComplianceFramework } from '../types.js';
import {
  MODULE_CONTROL_MAP,
  MODULE_EVIDENCE_MAP,
  getAllMappings,
} from '../mapper.js';

// bu-tpi package root (two levels up from src/compliance/__tests__)
const BU_TPI_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Helper: build a minimal framework with all control IDs referenced in MODULE_CONTROL_MAP.
 */
function collectAllControlIds(): string[] {
  const ids = new Set<string>();
  for (const controlIds of Object.values(MODULE_CONTROL_MAP)) {
    for (const id of controlIds) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

function makeFrameworkFromIds(ids: string[]): ComplianceFramework {
  return {
    id: 'test-all-controls',
    name: 'Test All Controls',
    version: '1.0',
    controls: ids.map((id) => ({
      id,
      name: `Control ${id}`,
      description: `Description for ${id}`,
      category: 'General',
      requirement: `Requirement for ${id}`,
    })),
  };
}

describe('H10.1: Evidence mapping verification', () => {
  // --- T-EV-01: All evidence references resolve to existing test files ---
  describe('T-EV-01: evidence file paths resolve to existing files', () => {
    for (const [moduleName, evidencePaths] of Object.entries(MODULE_EVIDENCE_MAP)) {
      for (const evidencePath of evidencePaths) {
        it(`${moduleName} -> ${evidencePath} exists`, () => {
          expect(typeof evidencePath).toBe('string');
          expect(evidencePath.length).toBeGreaterThan(0);
          expect(evidencePath).toMatch(/^src\//);

          const fullPath = path.resolve(BU_TPI_ROOT, evidencePath);
          expect(fs.existsSync(fullPath)).toBe(true);
        });
      }
    }
  });

  // --- T-EV-02: Modules with evidence are in MODULE_CONTROL_MAP ---
  describe('T-EV-02: evidence modules exist in MODULE_CONTROL_MAP', () => {
    for (const moduleName of Object.keys(MODULE_EVIDENCE_MAP)) {
      it(`${moduleName} is in MODULE_CONTROL_MAP`, () => {
        expect(MODULE_CONTROL_MAP).toHaveProperty(moduleName);
        expect(MODULE_CONTROL_MAP[moduleName].length).toBeGreaterThan(0);
      });
    }
  });

  // --- T-EV-03: H10.1 specific module-to-control mappings ---
  describe('T-EV-03: H10.1 control mappings are present', () => {
    it('fuzzing maps to LLM01, LLM02, AML.T0015 (BAISS-023, BAISS-001, BAISS-002, BAISS-003)', () => {
      const controls = MODULE_CONTROL_MAP['fuzzing'];
      expect(controls).toBeDefined();
      expect(controls).toContain('LLM01');
      expect(controls).toContain('LLM02');
      expect(controls).toContain('AML.T0015');
      expect(controls).toContain('ASVS-V5');
    });

    it('ssrf-detector maps to ASVS-V5, ISO27-VULN (BAISS-004, BAISS-036)', () => {
      const controls = MODULE_CONTROL_MAP['ssrf-detector'];
      expect(controls).toBeDefined();
      expect(controls).toContain('ASVS-V5');
      expect(controls).toContain('ISO27-VULN');
      expect(controls).toContain('LLM02');
      expect(controls).toContain('ASVS-V9');
    });

    it('llm-security maps to LLM06, ISO27-LOG (BAISS-005, BAISS-016)', () => {
      const controls = MODULE_CONTROL_MAP['llm-security'];
      expect(controls).toBeDefined();
      expect(controls).toContain('LLM06');
      expect(controls).toContain('ISO27-LOG');
      expect(controls).toContain('NIST-PRIV');
    });

    it('xxe-protopollution maps to LLM01, API-3, API-7 (BAISS-004, BAISS-002)', () => {
      const controls = MODULE_CONTROL_MAP['xxe-protopollution'];
      expect(controls).toBeDefined();
      expect(controls).toContain('LLM01');
      expect(controls).toContain('LLM02');
      expect(controls).toContain('API-3');
      expect(controls).toContain('API-7');
    });

    // Bushido Upgrade: threatfeed pipeline mapping (Part 3 #11)
    it('threatfeed maps to LLM03, AML.T0010, ISO27-SC (BAISS-010, BAISS-013)', () => {
      const controls = MODULE_CONTROL_MAP['threatfeed'];
      expect(controls).toBeDefined();
      expect(controls).toContain('LLM03');
      expect(controls).toContain('AML.T0010');
      expect(controls).toContain('AML.T0030');
      expect(controls).toContain('ISO27-SC');
      expect(controls).toContain('NIST-SR');
      expect(controls).toContain('SLSA-VER-1');
    });
  });

  // --- T-EV-04: Deduplication works correctly in getAllMappings ---
  describe('T-EV-04: deduplication merges evidence correctly', () => {
    it('merges duplicate controlIds from different modules', () => {
      const allIds = collectAllControlIds();
      const framework = makeFrameworkFromIds(allIds);

      // Both fuzzing and xxe-protopollution map to LLM02
      const mappings = getAllMappings(
        framework,
        ['fuzzing', 'xxe-protopollution'],
        {}
      );

      // LLM02 should appear only once after deduplication
      const llm02Mappings = mappings.filter((m) => m.controlId === 'LLM02');
      expect(llm02Mappings).toHaveLength(1);

      // The merged mapping should have both modules
      expect(llm02Mappings[0].moduleNames).toContain('fuzzing');
      expect(llm02Mappings[0].moduleNames).toContain('xxe-protopollution');

      // Evidence should be merged (2 entries for 2 modules)
      expect(llm02Mappings[0].evidence.length).toBeGreaterThanOrEqual(2);
    });

    it('merges module and fixture mappings for same controlId', () => {
      const framework = makeFrameworkFromIds(['LLM01', 'LLM02']);

      const mappings = getAllMappings(
        framework,
        ['fuzzing'],
        { 'prompt-injection': 10 }
      );

      // LLM01 is mapped by both fuzzing module and prompt-injection fixtures
      const llm01Mappings = mappings.filter((m) => m.controlId === 'LLM01');
      expect(llm01Mappings).toHaveLength(1);
      expect(llm01Mappings[0].moduleNames).toContain('fuzzing');
      expect(llm01Mappings[0].fixtureCategories).toContain('prompt-injection');
    });

    it('no duplicate controlIds in merged output', () => {
      const allIds = collectAllControlIds();
      const framework = makeFrameworkFromIds(allIds);

      const allModules = Object.keys(MODULE_CONTROL_MAP);
      const mappings = getAllMappings(framework, allModules, {});

      // Each controlId should appear at most once per frameworkId
      const seen = new Set<string>();
      for (const m of mappings) {
        const key = `${m.frameworkId}:${m.controlId}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
  });

  // --- T-EV-05: Evidence paths are consistently formatted ---
  describe('T-EV-05: evidence path format consistency', () => {
    it('all evidence paths use forward slashes and .test.ts extension', () => {
      for (const paths of Object.values(MODULE_EVIDENCE_MAP)) {
        for (const p of paths) {
          expect(p).not.toContain('\\');
          expect(p).toMatch(/\.test\.ts$/);
        }
      }
    });

    it('no duplicate evidence paths within a module', () => {
      for (const [mod, paths] of Object.entries(MODULE_EVIDENCE_MAP)) {
        const unique = new Set(paths);
        expect(unique.size).toBe(paths.length);
      }
    });
  });
});
