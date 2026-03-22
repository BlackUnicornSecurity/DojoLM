/**
 * KATANA Merkle Tree Tests (K4.4)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  signMerkleRoot,
  verifyMerkleRoot,
  buildAndSignMerkleTree,
  verifyCorpusIntegrity,
} from '../integrity/merkle-tree.js';
import { hashContent } from '../integrity/hmac-signer.js';
import { INTEGRITY_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const TEST_KEY = 'a'.repeat(64); // 64-char key for HMAC

function makeLeafHashes(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    hashContent(`sample-content-${i}`),
  );
}

// Env var save/restore
const originalHmacKey = process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];

beforeEach(() => {
  process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = TEST_KEY;
});

afterEach(() => {
  if (originalHmacKey !== undefined) {
    process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = originalHmacKey;
  } else {
    delete process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];
  }
});

// ---------------------------------------------------------------------------
// K4.4 — Merkle Tree Construction
// ---------------------------------------------------------------------------

describe('K4.4 — Merkle Tree Construction', () => {
  it('builds tree from single leaf', () => {
    const hashes = makeLeafHashes(1);
    const tree = buildMerkleTree(hashes);
    expect(tree.leaf_count).toBe(1);
    // With RFC 6962 domain separation, root = H(0x00 || leaf_hash), not raw leaf hash
    expect(tree.root_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(tree.root_hash).not.toBe(hashes[0]); // Domain-separated, so different
  });

  it('builds tree from two leaves', () => {
    const hashes = makeLeafHashes(2);
    const tree = buildMerkleTree(hashes);
    expect(tree.leaf_count).toBe(2);
    expect(tree.root_hash).toMatch(/^[a-f0-9]{64}$/);
    // Root should differ from either leaf
    expect(tree.root_hash).not.toBe(hashes[0]);
    expect(tree.root_hash).not.toBe(hashes[1]);
  });

  it('builds tree from odd number of leaves (3)', () => {
    const hashes = makeLeafHashes(3);
    const tree = buildMerkleTree(hashes);
    expect(tree.leaf_count).toBe(3);
    expect(tree.root_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('builds tree from power-of-two leaves (8)', () => {
    const hashes = makeLeafHashes(8);
    const tree = buildMerkleTree(hashes);
    expect(tree.leaf_count).toBe(8);
    expect(tree.root_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('builds tree from large set (1000)', () => {
    const hashes = makeLeafHashes(1000);
    const tree = buildMerkleTree(hashes);
    expect(tree.leaf_count).toBe(1000);
    expect(tree.root_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same inputs produce same root', () => {
    const hashes = makeLeafHashes(10);
    const tree1 = buildMerkleTree(hashes);
    const tree2 = buildMerkleTree(hashes);
    expect(tree1.root_hash).toBe(tree2.root_hash);
  });

  it('detects single leaf change', () => {
    const hashes1 = makeLeafHashes(10);
    const hashes2 = [...hashes1];
    hashes2[5] = hashContent('modified-content');

    const tree1 = buildMerkleTree(hashes1);
    const tree2 = buildMerkleTree(hashes2);
    expect(tree1.root_hash).not.toBe(tree2.root_hash);
  });

  it('throws on empty leaf set', () => {
    expect(() => buildMerkleTree([])).toThrow('Cannot build Merkle tree from empty leaf set');
  });

  it('throws on invalid leaf hash', () => {
    expect(() => buildMerkleTree(['not-a-hash'])).toThrow('Invalid leaf hash');
  });

  it('throws on too-short hex string', () => {
    expect(() => buildMerkleTree(['abcdef'])).toThrow('Invalid leaf hash');
  });
});

// ---------------------------------------------------------------------------
// K4.4 — Merkle Proofs
// ---------------------------------------------------------------------------

describe('K4.4 — Merkle Proof Generation & Verification', () => {
  it('generates and verifies proof for first leaf', () => {
    const hashes = makeLeafHashes(8);
    const proof = generateMerkleProof(hashes, 0);
    // leaf_hash is domain-separated: H(0x00 || hashes[0])
    expect(proof.leaf_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(proof.leaf_index).toBe(0);
    expect(verifyMerkleProof(proof)).toBe(true);
  });

  it('generates and verifies proof for last leaf', () => {
    const hashes = makeLeafHashes(8);
    const proof = generateMerkleProof(hashes, 7);
    expect(proof.leaf_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyMerkleProof(proof)).toBe(true);
  });

  it('generates and verifies proof for middle leaf', () => {
    const hashes = makeLeafHashes(8);
    const proof = generateMerkleProof(hashes, 4);
    expect(verifyMerkleProof(proof)).toBe(true);
  });

  it('generates and verifies proof for odd-count tree', () => {
    const hashes = makeLeafHashes(7);
    for (let i = 0; i < 7; i++) {
      const proof = generateMerkleProof(hashes, i);
      expect(verifyMerkleProof(proof)).toBe(true);
    }
  });

  it('generates and verifies proof for single leaf', () => {
    const hashes = makeLeafHashes(1);
    const proof = generateMerkleProof(hashes, 0);
    expect(proof.siblings).toHaveLength(0);
    expect(verifyMerkleProof(proof)).toBe(true);
  });

  it('rejects proof with tampered leaf hash', () => {
    const hashes = makeLeafHashes(8);
    const proof = generateMerkleProof(hashes, 3);
    const tampered = {
      ...proof,
      leaf_hash: hashContent('tampered'),
    };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });

  it('rejects proof with tampered sibling', () => {
    const hashes = makeLeafHashes(8);
    const proof = generateMerkleProof(hashes, 3);
    const tampered = {
      ...proof,
      siblings: [
        { hash: hashContent('fake'), position: proof.siblings[0].position },
        ...proof.siblings.slice(1),
      ],
    };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });

  it('throws on negative leaf index', () => {
    const hashes = makeLeafHashes(4);
    expect(() => generateMerkleProof(hashes, -1)).toThrow('out of bounds');
  });

  it('throws on leaf index >= length', () => {
    const hashes = makeLeafHashes(4);
    expect(() => generateMerkleProof(hashes, 4)).toThrow('out of bounds');
  });
});

// ---------------------------------------------------------------------------
// K4.4 — HMAC Signing
// ---------------------------------------------------------------------------

describe('K4.4 — Merkle Root HMAC Signing', () => {
  it('signs and verifies Merkle root', () => {
    const hashes = makeLeafHashes(10);
    const tree = buildMerkleTree(hashes);
    const signed = signMerkleRoot(tree, TEST_KEY);
    expect(signed.hmac_signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyMerkleRoot(signed, TEST_KEY)).toBe(true);
  });

  it('rejects tampered root hash', () => {
    const hashes = makeLeafHashes(10);
    const signed = buildAndSignMerkleTree(hashes, TEST_KEY);
    const tampered = { ...signed, root_hash: hashContent('wrong') };
    expect(verifyMerkleRoot(tampered, TEST_KEY)).toBe(false);
  });

  it('rejects wrong HMAC key', () => {
    const hashes = makeLeafHashes(10);
    const signed = buildAndSignMerkleTree(hashes, TEST_KEY);
    expect(verifyMerkleRoot(signed, 'b'.repeat(64))).toBe(false);
  });

  it('returns false for unsigned tree', () => {
    const hashes = makeLeafHashes(10);
    const tree = buildMerkleTree(hashes);
    expect(verifyMerkleRoot(tree)).toBe(false);
  });

  it('buildAndSignMerkleTree combines build + sign', () => {
    const hashes = makeLeafHashes(20);
    const signed = buildAndSignMerkleTree(hashes, TEST_KEY);
    expect(signed.leaf_count).toBe(20);
    expect(signed.hmac_signature).toBeDefined();
    expect(verifyMerkleRoot(signed, TEST_KEY)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// K4.4 — Corpus Integrity Verification
// ---------------------------------------------------------------------------

describe('K4.4 — Corpus Integrity Verification', () => {
  it('passes when corpus unchanged', () => {
    const hashes = makeLeafHashes(10);
    const signed = buildAndSignMerkleTree(hashes, TEST_KEY);
    const result = verifyCorpusIntegrity(hashes, signed, TEST_KEY);
    expect(result.root_match).toBe(true);
    expect(result.hmac_valid).toBe(true);
    expect(result.leaf_count_match).toBe(true);
  });

  it('detects modified sample', () => {
    const hashes = makeLeafHashes(10);
    const signed = buildAndSignMerkleTree(hashes, TEST_KEY);
    const modified = [...hashes];
    modified[3] = hashContent('tampered');
    const result = verifyCorpusIntegrity(modified, signed, TEST_KEY);
    expect(result.root_match).toBe(false);
    expect(result.hmac_valid).toBe(true); // HMAC of original root is still valid
    expect(result.leaf_count_match).toBe(true);
  });

  it('detects added sample', () => {
    const hashes = makeLeafHashes(10);
    const signed = buildAndSignMerkleTree(hashes, TEST_KEY);
    const extended = [...hashes, hashContent('extra')];
    const result = verifyCorpusIntegrity(extended, signed, TEST_KEY);
    expect(result.root_match).toBe(false);
    expect(result.leaf_count_match).toBe(false);
  });

  it('detects removed sample', () => {
    const hashes = makeLeafHashes(10);
    const signed = buildAndSignMerkleTree(hashes, TEST_KEY);
    const shortened = hashes.slice(0, 9);
    const result = verifyCorpusIntegrity(shortened, signed, TEST_KEY);
    expect(result.root_match).toBe(false);
    expect(result.leaf_count_match).toBe(false);
  });

  it('detects HMAC key mismatch', () => {
    const hashes = makeLeafHashes(10);
    const signed = buildAndSignMerkleTree(hashes, TEST_KEY);
    const result = verifyCorpusIntegrity(hashes, signed, 'b'.repeat(64));
    expect(result.root_match).toBe(true);
    expect(result.hmac_valid).toBe(false);
  });
});
