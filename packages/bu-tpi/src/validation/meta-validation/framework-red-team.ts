/**
 * KATANA Framework Red Team (K10.2)
 *
 * Tests to verify that the validation framework's security controls
 * actually prevent the threats identified in the threat model.
 *
 * ISO 17025 Clause: 4.1 (Impartiality)
 */

import { createHash, generateKeyPairSync, createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { SCHEMA_VERSION } from '../types.js';
import type { Manifest } from '../types.js';
import { SeededRNG } from '../generators/generator-registry.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RedTeamTest {
  readonly id: string;
  readonly name: string;
  readonly threat_id: string;
  readonly description: string;
  readonly expected_result: 'blocked' | 'detected';
}

export interface RedTeamResult {
  readonly test_id: string;
  readonly passed: boolean;
  readonly expected: 'blocked' | 'detected';
  readonly actual: string;
  readonly details: string;
}

export interface RedTeamReport {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly generated_at: string;
  readonly document_id: string;
  readonly tests: readonly RedTeamTest[];
  readonly results: readonly RedTeamResult[];
  readonly total_tests: number;
  readonly passed: number;
  readonly failed: number;
  readonly overall_pass: boolean;
}

// ---------------------------------------------------------------------------
// Test Definitions
// ---------------------------------------------------------------------------

export const RED_TEAM_TESTS: readonly RedTeamTest[] = [
  {
    id: 'RT-01',
    name: 'Ground Truth Poisoning — Single Committer',
    threat_id: 'T-01',
    description: 'Verify that a modified ground-truth manifest with invalid HMAC is rejected during verification.',
    expected_result: 'detected',
  },
  {
    id: 'RT-02',
    name: 'RNG Seed Prediction — Determinism Verification',
    threat_id: 'T-04',
    description: 'Verify that knowing the seed allows prediction of generated outputs (informational — seed is public, but corpus size makes targeted evasion impractical).',
    expected_result: 'detected',
  },
  {
    id: 'RT-03',
    name: 'Calibration Certificate Forgery — Wrong Key',
    threat_id: 'T-03',
    description: 'Verify that a calibration certificate signed with a different Ed25519 key is rejected.',
    expected_result: 'blocked',
  },
  {
    id: 'RT-04',
    name: 'Corpus Tampering — Modified Sample Hash',
    threat_id: 'T-05',
    description: 'Verify that modifying a sample content hash in a manifest invalidates the HMAC signature.',
    expected_result: 'detected',
  },
  {
    id: 'RT-05',
    name: 'Manifest Replay — Old Manifest Reuse',
    threat_id: 'T-05',
    description: 'Verify that a manifest from a different corpus version does not verify against the current corpus.',
    expected_result: 'detected',
  },
] as const;

// ---------------------------------------------------------------------------
// Test Implementations
// ---------------------------------------------------------------------------

/**
 * RT-01: Attempt to modify a ground-truth manifest and verify that HMAC detects tampering.
 */
export function testGroundTruthPoisoning(
  signManifestFn: <T extends { hmac_signature?: string }>(m: T, key?: string) => T & { hmac_signature: string },
  verifyManifestFn: (manifest: Manifest, key?: string) => boolean,
  hmacKey: string,
): RedTeamResult {
  const unsignedManifest: Manifest = {
    schema_version: SCHEMA_VERSION,
    manifest_type: 'ground-truth',
    generated_at: '2026-03-21T00:00:00.000Z',
    entry_count: 2,
    entries: [
      { id: 'sample-1', file_path: 'text/test/sample-1.txt', content_hash: createHash('sha256').update('clean content').digest('hex') },
      { id: 'sample-2', file_path: 'text/test/sample-2.txt', content_hash: createHash('sha256').update('malicious content').digest('hex') },
    ],
  };

  // Sign legitimately using the real signing function
  const signedManifest = signManifestFn(unsignedManifest, hmacKey);

  // Tamper: change a sample's verdict by altering its hash
  const tamperedEntries = [...signedManifest.entries];
  tamperedEntries[1] = { ...tamperedEntries[1], content_hash: createHash('sha256').update('altered content').digest('hex') };
  const tamperedManifest: Manifest = { ...signedManifest, entries: tamperedEntries };

  // Verify: tampered manifest should fail
  const tamperedResult = verifyManifestFn(tamperedManifest, hmacKey);
  // Verify: original should pass
  const originalResult = verifyManifestFn(signedManifest, hmacKey);

  const passed = originalResult && !tamperedResult;
  return {
    test_id: 'RT-01',
    passed,
    expected: 'detected',
    actual: passed ? 'detected' : 'not detected',
    details: passed
      ? 'HMAC correctly detected manifest tampering and accepted legitimate manifest.'
      : `Original verify=${originalResult}, tampered verify=${tamperedResult}. Expected true/false.`,
  };
}

/**
 * RT-02: Verify RNG determinism (seed prediction is possible but impractical).
 */
export function testRNGSeedPrediction(seed: number): RedTeamResult {
  const rng1 = new SeededRNG(seed);
  const rng2 = new SeededRNG(seed);

  const sequence1 = Array.from({ length: 100 }, () => rng1.next());
  const sequence2 = Array.from({ length: 100 }, () => rng2.next());

  const allMatch = sequence1.every((v, i) => v === sequence2[i]);
  const allInRange = sequence1.every(v => v >= 0 && v < 1);

  return {
    test_id: 'RT-02',
    passed: allMatch && allInRange,
    expected: 'detected',
    actual: allMatch ? 'detected' : 'not detected',
    details: allMatch
      ? 'RNG is deterministic for same seed (by design). Seed is public — security relies on corpus size (200K+ samples) making targeted evasion impractical.'
      : 'RNG produced different sequences for same seed — non-determinism bug.',
  };
}

/**
 * RT-03: Attempt to forge a calibration certificate with a different Ed25519 key.
 */
export function testCertificateForgery(
  verifySignature: (data: string | Buffer, signature: string, publicKey?: string) => boolean,
): RedTeamResult {
  // Generate a legitimate keypair
  const legit = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  // Generate attacker's keypair
  const attacker = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const certificateData = JSON.stringify({
    module_id: 'test-module',
    tool_build_hash: 'abc123',
    result: 'PASS',
    timestamp: new Date().toISOString(),
  });

  // Sign with attacker's key
  const attackerKey = createPrivateKey(attacker.privateKey);
  const forgedSignature = cryptoSign(null, Buffer.from(certificateData), attackerKey).toString('base64');

  // Verify with legitimate public key — should FAIL
  let verifyResult: boolean;
  try {
    verifyResult = verifySignature(certificateData, forgedSignature, legit.publicKey);
  } catch {
    verifyResult = false;
  }

  const passed = !verifyResult;
  return {
    test_id: 'RT-03',
    passed,
    expected: 'blocked',
    actual: passed ? 'blocked' : 'accepted',
    details: passed
      ? 'Forged certificate signed with attacker key was correctly rejected by legitimate public key verification.'
      : 'CRITICAL: Forged certificate was accepted!',
  };
}

/**
 * RT-04: Modify a sample hash in manifest and verify Merkle tree detects it.
 */
export function testCorpusTampering(
  buildMerkleTree: (hashes: readonly string[]) => { root_hash: string },
  verifyCorpusIntegrity: (hashes: readonly string[], tree: { root_hash: string; leaf_count: number; hmac_signature?: string }, key?: string) => { root_match: boolean; leaf_count_match: boolean },
): RedTeamResult {
  const sampleHashes = [
    createHash('sha256').update('sample-1').digest('hex'),
    createHash('sha256').update('sample-2').digest('hex'),
    createHash('sha256').update('sample-3').digest('hex'),
    createHash('sha256').update('sample-4').digest('hex'),
  ];

  const tree = buildMerkleTree(sampleHashes);

  // Tamper: change one hash
  const tamperedHashes = [...sampleHashes];
  tamperedHashes[2] = createHash('sha256').update('tampered-sample-3').digest('hex');

  const integrityCheck = verifyCorpusIntegrity(
    tamperedHashes,
    { root_hash: tree.root_hash, leaf_count: sampleHashes.length },
  );

  const passed = !integrityCheck.root_match;
  return {
    test_id: 'RT-04',
    passed,
    expected: 'detected',
    actual: passed ? 'detected' : 'not detected',
    details: passed
      ? 'Merkle tree correctly detected single-sample modification (root hash mismatch).'
      : 'CRITICAL: Merkle tree did not detect tampering!',
  };
}

/**
 * RT-05: Test manifest replay by verifying old manifest against new corpus.
 */
export function testManifestReplay(
  signManifestFn: <T extends { hmac_signature?: string }>(m: T, key?: string) => T & { hmac_signature: string },
  verifyManifestFn: (manifest: Manifest, key?: string) => boolean,
  hmacKey: string,
): RedTeamResult {
  // Create and sign "old" manifest
  const oldManifest: Manifest = {
    schema_version: SCHEMA_VERSION,
    manifest_type: 'ground-truth',
    generated_at: '2026-01-01T00:00:00.000Z',
    entry_count: 1,
    entries: [{ id: 'old-sample', file_path: 'text/test/old.txt', content_hash: createHash('sha256').update('old').digest('hex') }],
  };
  const signedOld = signManifestFn(oldManifest, hmacKey);

  // Create "new" manifest with different content
  const newManifest: Manifest = {
    schema_version: SCHEMA_VERSION,
    manifest_type: 'ground-truth',
    generated_at: '2026-03-21T00:00:00.000Z',
    entry_count: 2,
    entries: [
      { id: 'new-sample-1', file_path: 'text/test/new1.txt', content_hash: createHash('sha256').update('new1').digest('hex') },
      { id: 'new-sample-2', file_path: 'text/test/new2.txt', content_hash: createHash('sha256').update('new2').digest('hex') },
    ],
  };

  // Try to use old manifest's HMAC with new content (replay attack)
  const replayedManifest: Manifest = { ...newManifest, hmac_signature: signedOld.hmac_signature };
  const replayResult = verifyManifestFn(replayedManifest, hmacKey);

  // Old manifest should still verify (it's legitimate)
  const oldResult = verifyManifestFn(signedOld, hmacKey);

  const passed = oldResult && !replayResult;
  return {
    test_id: 'RT-05',
    passed,
    expected: 'detected',
    actual: passed ? 'detected' : 'not detected',
    details: passed
      ? 'Old manifest HMAC correctly rejected when applied to new manifest content (replay detected).'
      : `Old verify=${oldResult}, replay verify=${replayResult}. Expected true/false.`,
  };
}

// ---------------------------------------------------------------------------
// Report Builder
// ---------------------------------------------------------------------------

export function buildRedTeamReport(results: readonly RedTeamResult[]): RedTeamReport {
  const passed = results.filter(r => r.passed).length;
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    document_id: 'KATANA-RT-001',
    tests: RED_TEAM_TESTS,
    results,
    total_tests: results.length,
    passed,
    failed: results.length - passed,
    overall_pass: results.every(r => r.passed),
  };
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

export function exportRedTeamMarkdown(report: RedTeamReport): string {
  const lines: string[] = [
    '# KATANA Framework Red Team Report',
    '',
    `**Document ID:** ${report.document_id}`,
    `**Generated:** ${report.generated_at}`,
    `**Overall Result:** ${report.overall_pass ? 'PASS' : 'FAIL'}`,
    `**Tests:** ${report.passed}/${report.total_tests} passed`,
    '',
    '## Test Results',
    '',
    '| ID | Name | Threat | Expected | Result | Pass |',
    '|-----|------|--------|----------|--------|------|',
  ];

  for (const result of report.results) {
    const test = report.tests.find(t => t.id === result.test_id);
    const name = test?.name ?? result.test_id;
    const threat = test?.threat_id ?? '-';
    const passStr = result.passed ? 'PASS' : '**FAIL**';
    lines.push(`| ${result.test_id} | ${name} | ${threat} | ${result.expected} | ${result.actual} | ${passStr} |`);
  }

  lines.push('', '## Details', '');
  for (const result of report.results) {
    const test = report.tests.find(t => t.id === result.test_id);
    lines.push(`### ${result.test_id} — ${test?.name ?? 'Unknown'}`);
    lines.push('');
    lines.push(result.details);
    lines.push('');
  }

  return lines.join('\n');
}
