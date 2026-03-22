/**
 * K10.1 — Threat Model Tests
 */
import { describe, it, expect } from 'vitest';
import {
  THREAT_ACTORS,
  ASSETS,
  THREATS,
  CONTROLS,
  RESIDUAL_RISKS,
  buildThreatModel,
  computeThreatCoverage,
  exportThreatModelMarkdown,
} from '../governance/threat-model.js';
import type { ThreatModel } from '../governance/threat-model.js';
import { SCHEMA_VERSION } from '../types.js';

describe('K10.1 — Threat Model', () => {
  describe('Data Completeness', () => {
    it('should define at least 3 threat actors', () => {
      expect(THREAT_ACTORS.length).toBeGreaterThanOrEqual(3);
    });

    it('should define at least 5 assets', () => {
      expect(ASSETS.length).toBeGreaterThanOrEqual(5);
    });

    it('should define at least 5 threats', () => {
      expect(THREATS.length).toBeGreaterThanOrEqual(5);
    });

    it('should define at least 10 controls', () => {
      expect(CONTROLS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique IDs for all actors', () => {
      const ids = THREAT_ACTORS.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique IDs for all assets', () => {
      const ids = ASSETS.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique IDs for all threats', () => {
      const ids = THREATS.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique IDs for all controls', () => {
      const ids = CONTROLS.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should reference only valid actor IDs in threats', () => {
      const actorIds = new Set(THREAT_ACTORS.map(a => a.id));
      for (const threat of THREATS) {
        for (const actorId of threat.actor_ids) {
          expect(actorIds.has(actorId)).toBe(true);
        }
      }
    });

    it('should reference only valid asset IDs in threats', () => {
      const assetIds = new Set(ASSETS.map(a => a.id));
      for (const threat of THREATS) {
        for (const assetId of threat.asset_ids) {
          expect(assetIds.has(assetId)).toBe(true);
        }
      }
    });

    it('should reference only valid threat IDs in controls', () => {
      const threatIds = new Set(THREATS.map(t => t.id));
      for (const control of CONTROLS) {
        for (const threatId of control.threat_ids) {
          expect(threatIds.has(threatId)).toBe(true);
        }
      }
    });

    it('should reference only valid threat IDs in residual risks', () => {
      const threatIds = new Set(THREATS.map(t => t.id));
      for (const risk of RESIDUAL_RISKS) {
        expect(threatIds.has(risk.threat_id)).toBe(true);
      }
    });

    it('should reference only valid control IDs in residual risks', () => {
      const controlIds = new Set(CONTROLS.map(c => c.id));
      for (const risk of RESIDUAL_RISKS) {
        for (const controlId of risk.control_ids) {
          expect(controlIds.has(controlId)).toBe(true);
        }
      }
    });
  });

  describe('buildThreatModel', () => {
    it('should produce a valid ThreatModel', () => {
      const model = buildThreatModel();
      expect(model.schema_version).toBe(SCHEMA_VERSION);
      expect(model.document_id).toBe('KATANA-TM-001');
      expect(model.title).toContain('Threat Model');
      expect(model.actors.length).toBeGreaterThanOrEqual(3);
      expect(model.assets.length).toBeGreaterThanOrEqual(5);
      expect(model.threats.length).toBeGreaterThanOrEqual(5);
      expect(model.controls.length).toBeGreaterThanOrEqual(10);
    });

    it('should include ISO timestamp', () => {
      const model = buildThreatModel();
      expect(model.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('computeThreatCoverage', () => {
    it('should map all threats to their controls', () => {
      const model = buildThreatModel();
      const coverage = computeThreatCoverage(model);
      expect(coverage.length).toBe(model.threats.length);
    });

    it('should mark threats with controls as covered', () => {
      const model = buildThreatModel();
      const coverage = computeThreatCoverage(model);
      const covered = coverage.filter(c => c.covered);
      expect(covered.length).toBeGreaterThan(0);
    });

    it('should identify threats with residual risks', () => {
      const model = buildThreatModel();
      const coverage = computeThreatCoverage(model);
      const withResidual = coverage.filter(c => c.has_residual_risk);
      expect(withResidual.length).toBe(RESIDUAL_RISKS.length);
    });

    it('should flag uncovered threats', () => {
      const emptyModel: ThreatModel = {
        schema_version: SCHEMA_VERSION,
        generated_at: new Date().toISOString(),
        document_id: 'test',
        title: 'test',
        scope: 'test',
        actors: [],
        assets: [],
        threats: [{ id: 'T-X', name: 'Uncovered', description: '', actor_ids: [], asset_ids: [], attack_vector: '', impact: 'high', likelihood: 'high' }],
        controls: [],
        residual_risks: [],
      };
      const coverage = computeThreatCoverage(emptyModel);
      expect(coverage[0].covered).toBe(false);
      expect(coverage[0].control_ids).toEqual([]);
    });
  });

  describe('exportThreatModelMarkdown', () => {
    it('should produce valid markdown with all sections', () => {
      const model = buildThreatModel();
      const md = exportThreatModelMarkdown(model);
      expect(md).toContain('# KATANA');
      expect(md).toContain('## Threat Actors');
      expect(md).toContain('## Assets');
      expect(md).toContain('## Threats');
      expect(md).toContain('## Controls');
      expect(md).toContain('## Residual Risks');
      expect(md).toContain('## Threat-Control Coverage Matrix');
    });

    it('should include document metadata', () => {
      const model = buildThreatModel();
      const md = exportThreatModelMarkdown(model);
      expect(md).toContain('KATANA-TM-001');
      expect(md).toContain(SCHEMA_VERSION);
    });
  });

  describe('Threat Model Integrity', () => {
    it('should cover ground truth poisoning (T-01)', () => {
      const model = buildThreatModel();
      const coverage = computeThreatCoverage(model);
      const t01 = coverage.find(c => c.threat_id === 'T-01');
      expect(t01).toBeDefined();
      expect(t01!.covered).toBe(true);
      expect(t01!.control_ids.length).toBeGreaterThanOrEqual(2);
    });

    it('should cover supply chain attack (T-06)', () => {
      const model = buildThreatModel();
      const coverage = computeThreatCoverage(model);
      const t06 = coverage.find(c => c.threat_id === 'T-06');
      expect(t06).toBeDefined();
      expect(t06!.covered).toBe(true);
    });

    it('should cover key compromise (T-08)', () => {
      const model = buildThreatModel();
      const coverage = computeThreatCoverage(model);
      const t08 = coverage.find(c => c.threat_id === 'T-08');
      expect(t08).toBeDefined();
      expect(t08!.covered).toBe(true);
    });

    it('should have all critical/high impact threats covered', () => {
      const model = buildThreatModel();
      const coverage = computeThreatCoverage(model);
      const criticalThreats = model.threats.filter(t => t.impact === 'critical' || t.impact === 'high');
      for (const threat of criticalThreats) {
        const c = coverage.find(x => x.threat_id === threat.id);
        expect(c?.covered).toBe(true);
      }
    });
  });
});
