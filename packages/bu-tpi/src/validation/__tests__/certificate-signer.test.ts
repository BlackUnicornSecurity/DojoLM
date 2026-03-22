/**
 * Tests for KATANA Digital Signatures (K8.2)
 *
 * Ed25519 keypair generation, signing, and verification.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  generateSigningKeyPair,
  signData,
  verifySignature,
  hashAndSign,
  verifyHashAndSignature,
  signReport,
  verifyReport,
  isSigningKeyAvailable,
  isVerifyKeyAvailable,
} from '../integrity/certificate-signer.js';
import { INTEGRITY_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Test keypair (generated once for all tests)
// ---------------------------------------------------------------------------

let testPrivateKey: string;
let testPublicKey: string;

beforeAll(() => {
  const pair = generateSigningKeyPair();
  testPrivateKey = pair.privateKey;
  testPublicKey = pair.publicKey;
});

// ---------------------------------------------------------------------------
// Key Generation
// ---------------------------------------------------------------------------

describe('generateSigningKeyPair', () => {
  it('generates valid PEM-encoded Ed25519 keys', () => {
    const pair = generateSigningKeyPair();
    expect(pair.privateKey).toContain('BEGIN PRIVATE KEY');
    expect(pair.publicKey).toContain('BEGIN PUBLIC KEY');
  });

  it('generates unique keypairs each time', () => {
    const pair1 = generateSigningKeyPair();
    const pair2 = generateSigningKeyPair();
    expect(pair1.privateKey).not.toBe(pair2.privateKey);
    expect(pair1.publicKey).not.toBe(pair2.publicKey);
  });
});

// ---------------------------------------------------------------------------
// Signing & Verification
// ---------------------------------------------------------------------------

describe('signData / verifySignature', () => {
  it('signs and verifies string data', () => {
    const data = 'hello world';
    const signature = signData(data, testPrivateKey);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);

    const valid = verifySignature(data, signature, testPublicKey);
    expect(valid).toBe(true);
  });

  it('signs and verifies Buffer data', () => {
    const data = Buffer.from('binary data here');
    const signature = signData(data, testPrivateKey);
    const valid = verifySignature(data, signature, testPublicKey);
    expect(valid).toBe(true);
  });

  it('rejects tampered data', () => {
    const signature = signData('original', testPrivateKey);
    const valid = verifySignature('tampered', signature, testPublicKey);
    expect(valid).toBe(false);
  });

  it('rejects tampered signature', () => {
    const signature = signData('data', testPrivateKey);
    const tampered = 'ff' + signature.slice(2);
    const valid = verifySignature('data', tampered, testPublicKey);
    expect(valid).toBe(false);
  });

  it('rejects wrong public key', () => {
    const signature = signData('data', testPrivateKey);
    const otherPair = generateSigningKeyPair();
    const valid = verifySignature('data', signature, otherPair.publicKey);
    expect(valid).toBe(false);
  });

  it('returns false for invalid signature hex', () => {
    const valid = verifySignature('data', 'not-hex', testPublicKey);
    expect(valid).toBe(false);
  });

  it('returns false for empty signature', () => {
    const valid = verifySignature('data', '', testPublicKey);
    expect(valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hash + Sign
// ---------------------------------------------------------------------------

describe('hashAndSign / verifyHashAndSignature', () => {
  it('computes hash and signature', () => {
    const result = hashAndSign('test content', testPrivateKey);
    expect(result.content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.signature.length).toBeGreaterThan(0);
  });

  it('verifies valid content and signature', () => {
    const result = hashAndSign('test content', testPrivateKey);
    const valid = verifyHashAndSignature(
      'test content',
      result.signature,
      testPublicKey,
    );
    expect(valid).toBe(true);
  });

  it('rejects tampered content', () => {
    const result = hashAndSign('original', testPrivateKey);
    const valid = verifyHashAndSignature(
      'tampered',
      result.signature,
      testPublicKey,
    );
    expect(valid).toBe(false);
  });

  it('rejects invalid signature', () => {
    const valid = verifyHashAndSignature(
      'content',
      'ff'.repeat(32),
      testPublicKey,
    );
    expect(valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Report Signing
// ---------------------------------------------------------------------------

describe('signReport / verifyReport', () => {
  const sampleReport = {
    report_id: 'test-report-1',
    run_id: 'test-run-1',
    generated_at: '2026-03-21T00:00:00.000Z',
    overall_verdict: 'PASS' as const,
    data: { nested: true },
  };

  it('signs a report and adds signature field', () => {
    const signed = signReport(sampleReport, testPrivateKey);
    expect(signed.signature).toBeDefined();
    expect(typeof signed.signature).toBe('string');
    expect(signed.signature.length).toBeGreaterThan(0);
    // Original fields preserved
    expect(signed.report_id).toBe('test-report-1');
    expect(signed.data).toEqual({ nested: true });
  });

  it('verifies a signed report', () => {
    const signed = signReport(sampleReport, testPrivateKey);
    const valid = verifyReport(signed, testPublicKey);
    expect(valid).toBe(true);
  });

  it('rejects tampered report', () => {
    const signed = signReport(sampleReport, testPrivateKey);
    const tampered = { ...signed, overall_verdict: 'FAIL' as const };
    const valid = verifyReport(tampered, testPublicKey);
    expect(valid).toBe(false);
  });

  it('rejects unsigned report', () => {
    const valid = verifyReport(sampleReport, testPublicKey);
    expect(valid).toBe(false);
  });

  it('rejects report with empty signature', () => {
    const valid = verifyReport({ ...sampleReport, signature: '' }, testPublicKey);
    expect(valid).toBe(false);
  });

  it('handles reports that already have a signature field', () => {
    const withSig = { ...sampleReport, signature: 'old-sig' };
    const signed = signReport(withSig, testPrivateKey);
    expect(signed.signature).not.toBe('old-sig');
    expect(verifyReport(signed, testPublicKey)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Key Availability
// ---------------------------------------------------------------------------

describe('isSigningKeyAvailable / isVerifyKeyAvailable', () => {
  const origSigning = process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR];
  const origVerify = process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR];

  afterAll(() => {
    if (origSigning) {
      process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR] = origSigning;
    } else {
      delete process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR];
    }
    if (origVerify) {
      process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR] = origVerify;
    } else {
      delete process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR];
    }
  });

  it('returns false when env vars not set', () => {
    delete process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR];
    delete process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR];
    expect(isSigningKeyAvailable()).toBe(false);
    expect(isVerifyKeyAvailable()).toBe(false);
  });

  it('returns true when env vars are set', () => {
    process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR] = testPrivateKey;
    process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR] = testPublicKey;
    expect(isSigningKeyAvailable()).toBe(true);
    expect(isVerifyKeyAvailable()).toBe(true);
  });
});
