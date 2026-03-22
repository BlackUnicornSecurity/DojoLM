/**
 * K1.2 / K8.1 — HMAC Signing Tests
 *
 * Validates HMAC signing, verification, content hashing,
 * and manifest signing with timing-safe comparison.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  signHmac,
  verifyHmac,
  hashContent,
  hashFile,
  signManifest,
  verifyManifest,
  isHmacKeyAvailable,
} from '../integrity/hmac-signer.js';
import { INTEGRITY_CONFIG } from '../config.js';

const TEST_KEY = 'test-hmac-key-that-is-long-enough';

describe('K1.2 — HMAC Signing', () => {
  it('signs data with explicit key', () => {
    const sig = signHmac('test data', TEST_KEY);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it('same data + same key = same signature', () => {
    const sig1 = signHmac('test data', TEST_KEY);
    const sig2 = signHmac('test data', TEST_KEY);
    expect(sig1).toBe(sig2);
  });

  it('different data = different signature', () => {
    const sig1 = signHmac('data1', TEST_KEY);
    const sig2 = signHmac('data2', TEST_KEY);
    expect(sig1).not.toBe(sig2);
  });

  it('different key = different signature', () => {
    const sig1 = signHmac('test data', TEST_KEY);
    const sig2 = signHmac('test data', 'different-key-that-is-long-enough');
    expect(sig1).not.toBe(sig2);
  });
});

describe('K1.2 — HMAC Verification', () => {
  it('verifies valid signature', () => {
    const sig = signHmac('test data', TEST_KEY);
    expect(verifyHmac('test data', sig, TEST_KEY)).toBe(true);
  });

  it('rejects tampered data', () => {
    const sig = signHmac('test data', TEST_KEY);
    expect(verifyHmac('tampered data', sig, TEST_KEY)).toBe(false);
  });

  it('rejects wrong signature', () => {
    expect(verifyHmac('test data', 'a'.repeat(64), TEST_KEY)).toBe(false);
  });

  it('rejects wrong length signature', () => {
    expect(verifyHmac('test data', 'short', TEST_KEY)).toBe(false);
  });

  it('uses timing-safe comparison', () => {
    // Verify that wrong signatures of correct length are rejected
    const sig = signHmac('test data', TEST_KEY);
    const wrongSig = sig.replace(/[0-9a-f]/, c => c === '0' ? '1' : '0');
    expect(verifyHmac('test data', wrongSig, TEST_KEY)).toBe(false);
  });
});

describe('K1.2 — Content Hashing', () => {
  it('produces 64-char hex hash for string', () => {
    const hash = hashContent('test content');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces 64-char hex hash for Buffer', () => {
    const hash = hashContent(Buffer.from('test content'));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('string and Buffer of same content produce same hash', () => {
    const h1 = hashContent('test content');
    const h2 = hashContent(Buffer.from('test content'));
    expect(h1).toBe(h2);
  });

  it('hashFile is alias for hashContent', () => {
    const h1 = hashContent('test');
    const h2 = hashFile('test');
    expect(h1).toBe(h2);
  });

  it('is deterministic', () => {
    expect(hashContent('x')).toBe(hashContent('x'));
  });

  it('different content = different hash', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });
});

describe('K1.2 — Manifest Signing', () => {
  it('signs manifest and adds hmac_signature', () => {
    const manifest = {
      schema_version: '1.0.0' as const,
      manifest_type: 'ground-truth' as const,
      generated_at: '2026-03-21T00:00:00.000Z',
      entry_count: 0,
      entries: [],
    };
    const signed = signManifest(manifest, TEST_KEY);
    expect(signed.hmac_signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verifyManifest accepts valid signed manifest', () => {
    const manifest = {
      schema_version: '1.0.0' as const,
      manifest_type: 'ground-truth' as const,
      generated_at: '2026-03-21T00:00:00.000Z',
      entry_count: 1,
      entries: [{ id: 'gt-001', file_path: 'test.txt', content_hash: 'a'.repeat(64) }],
    };
    const signed = signManifest(manifest, TEST_KEY);
    expect(verifyManifest(signed, TEST_KEY)).toBe(true);
  });

  it('verifyManifest rejects tampered manifest', () => {
    const manifest = {
      schema_version: '1.0.0' as const,
      manifest_type: 'ground-truth' as const,
      generated_at: '2026-03-21T00:00:00.000Z',
      entry_count: 0,
      entries: [],
    };
    const signed = signManifest(manifest, TEST_KEY);
    const tampered = { ...signed, entry_count: 999 };
    expect(verifyManifest(tampered, TEST_KEY)).toBe(false);
  });

  it('verifyManifest rejects manifest without signature', () => {
    const manifest = {
      schema_version: '1.0.0' as const,
      entry_count: 0,
    };
    expect(verifyManifest(manifest)).toBe(false);
  });

  it('re-signing produces same signature', () => {
    const manifest = {
      schema_version: '1.0.0' as const,
      data: 'test',
    };
    const signed1 = signManifest(manifest, TEST_KEY);
    const signed2 = signManifest(manifest, TEST_KEY);
    expect(signed1.hmac_signature).toBe(signed2.hmac_signature);
  });
});

describe('K1.2 — Key Management', () => {
  const originalEnv = process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = originalEnv;
    } else {
      delete process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];
    }
  });

  it('isHmacKeyAvailable returns false when not set', () => {
    delete process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];
    expect(isHmacKeyAvailable()).toBe(false);
  });

  it('isHmacKeyAvailable returns false for short key', () => {
    process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = 'short';
    expect(isHmacKeyAvailable()).toBe(false);
  });

  it('isHmacKeyAvailable returns true for valid key', () => {
    process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = TEST_KEY;
    expect(isHmacKeyAvailable()).toBe(true);
  });

  it('signHmac throws when key not available', () => {
    delete process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];
    expect(() => signHmac('data')).toThrow('HMAC key not available');
  });

  it('signHmac uses env key when no explicit key', () => {
    process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = TEST_KEY;
    const sig = signHmac('data');
    const expected = signHmac('data', TEST_KEY);
    expect(sig).toBe(expected);
  });
});
