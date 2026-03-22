/**
 * K10.2 — Framework Red Team Tests
 */
import { describe, it, expect } from 'vitest';
import {
  RED_TEAM_TESTS,
  testGroundTruthPoisoning,
  testRNGSeedPrediction,
  testCertificateForgery,
  testCorpusTampering,
  testManifestReplay,
  buildRedTeamReport,
  exportRedTeamMarkdown,
} from '../meta-validation/framework-red-team.js';
import { signManifest, verifyManifest } from '../integrity/hmac-signer.js';
import { verifySignature } from '../integrity/certificate-signer.js';
import { buildMerkleTree, verifyCorpusIntegrity } from '../integrity/merkle-tree.js';
import { SCHEMA_VERSION } from '../types.js';

const TEST_HMAC_KEY = 'a'.repeat(32);

describe('K10.2 — Framework Red Team', () => {
  describe('Test Definitions', () => {
    it('should define at least 5 red team tests', () => {
      expect(RED_TEAM_TESTS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique test IDs', () => {
      const ids = RED_TEAM_TESTS.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should reference threat IDs', () => {
      for (const test of RED_TEAM_TESTS) {
        expect(test.threat_id).toMatch(/^T-\d{2}$/);
      }
    });
  });

  describe('RT-01 — Ground Truth Poisoning', () => {
    it('should detect HMAC tampering on modified manifest', () => {
      const result = testGroundTruthPoisoning(signManifest, verifyManifest, TEST_HMAC_KEY);
      expect(result.test_id).toBe('RT-01');
      expect(result.passed).toBe(true);
      expect(result.actual).toBe('detected');
    });
  });

  describe('RT-02 — RNG Seed Prediction', () => {
    it('should confirm RNG determinism (informational)', () => {
      const result = testRNGSeedPrediction(42);
      expect(result.test_id).toBe('RT-02');
      expect(result.passed).toBe(true);
      expect(result.details).toContain('corpus size');
    });

    it('should be deterministic for different seeds too', () => {
      const result = testRNGSeedPrediction(12345);
      expect(result.passed).toBe(true);
    });
  });

  describe('RT-03 — Certificate Forgery', () => {
    it('should reject forged certificate signed with different key', () => {
      const result = testCertificateForgery(verifySignature);
      expect(result.test_id).toBe('RT-03');
      expect(result.passed).toBe(true);
      expect(result.actual).toBe('blocked');
    });
  });

  describe('RT-04 — Corpus Tampering', () => {
    it('should detect single-sample modification via Merkle tree', () => {
      const result = testCorpusTampering(buildMerkleTree, verifyCorpusIntegrity);
      expect(result.test_id).toBe('RT-04');
      expect(result.passed).toBe(true);
      expect(result.actual).toBe('detected');
    });
  });

  describe('RT-05 — Manifest Replay', () => {
    it('should detect old HMAC reused on new manifest', () => {
      const result = testManifestReplay(signManifest, verifyManifest, TEST_HMAC_KEY);
      expect(result.test_id).toBe('RT-05');
      expect(result.passed).toBe(true);
      expect(result.actual).toBe('detected');
    });
  });

  describe('buildRedTeamReport', () => {
    it('should produce a complete report from results', () => {
      const results = [
        testGroundTruthPoisoning(signManifest, verifyManifest, TEST_HMAC_KEY),
        testRNGSeedPrediction(42),
        testCorpusTampering(buildMerkleTree, verifyCorpusIntegrity),
        testManifestReplay(signManifest, verifyManifest, TEST_HMAC_KEY),
      ];
      const report = buildRedTeamReport(results);

      expect(report.schema_version).toBe(SCHEMA_VERSION);
      expect(report.document_id).toBe('KATANA-RT-001');
      expect(report.total_tests).toBe(4);
      expect(report.passed).toBe(4);
      expect(report.failed).toBe(0);
      expect(report.overall_pass).toBe(true);
    });

    it('should report failures correctly', () => {
      const failedResult = {
        test_id: 'RT-FAKE',
        passed: false,
        expected: 'blocked' as const,
        actual: 'accepted',
        details: 'test failure',
      };
      const report = buildRedTeamReport([failedResult]);
      expect(report.overall_pass).toBe(false);
      expect(report.failed).toBe(1);
    });
  });

  describe('exportRedTeamMarkdown', () => {
    it('should produce valid markdown', () => {
      const results = [
        testGroundTruthPoisoning(signManifest, verifyManifest, TEST_HMAC_KEY),
        testRNGSeedPrediction(42),
      ];
      const report = buildRedTeamReport(results);
      const md = exportRedTeamMarkdown(report);
      expect(md).toContain('# KATANA Framework Red Team Report');
      expect(md).toContain('## Test Results');
      expect(md).toContain('## Details');
      expect(md).toContain('RT-01');
      expect(md).toContain('RT-02');
    });
  });

  describe('Full Red Team Suite', () => {
    it('should pass all 5 red team tests (RT-01 through RT-05)', () => {
      const results = [
        testGroundTruthPoisoning(signManifest, verifyManifest, TEST_HMAC_KEY),
        testRNGSeedPrediction(42),
        testCertificateForgery(verifySignature),
        testCorpusTampering(buildMerkleTree, verifyCorpusIntegrity),
        testManifestReplay(signManifest, verifyManifest, TEST_HMAC_KEY),
      ];
      const report = buildRedTeamReport(results);
      expect(report.overall_pass).toBe(true);
      expect(report.passed).toBe(5);
      expect(report.failed).toBe(0);
    });
  });
});
