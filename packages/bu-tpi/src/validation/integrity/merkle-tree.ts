/**
 * KATANA Merkle Tree Corpus Integrity (K4.4)
 *
 * Provides tamper-proof corpus integrity verification via Merkle tree.
 * Each sample SHA-256 hash is a leaf. Root hash = corpus version identifier.
 * Root hash is HMAC-signed with key stored outside repo (env var).
 *
 * Uses RFC 6962 domain-separated hashing:
 * - Leaf nodes: H(0x00 || leaf_data)
 * - Interior nodes: H(0x01 || left || right)
 * This prevents second-preimage attacks from leaf/interior hash collisions.
 *
 * ISO 17025 Clause 6.5: Metrological traceability.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { INTEGRITY_CONFIG } from '../config.js';
import { signHmac, verifyHmac } from './hmac-signer.js';

// ---------------------------------------------------------------------------
// Domain Separator Prefixes (RFC 6962 §2.1)
// ---------------------------------------------------------------------------

const LEAF_PREFIX = Buffer.from([0x00]);
const INTERIOR_PREFIX = Buffer.from([0x01]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MerkleNode {
  readonly hash: string;
  readonly left?: MerkleNode;
  readonly right?: MerkleNode;
}

export interface MerkleTree {
  readonly root: MerkleNode;
  readonly leaf_count: number;
  readonly root_hash: string;
  readonly hmac_signature?: string;
}

export interface MerkleProof {
  readonly leaf_hash: string;
  readonly leaf_index: number;
  readonly siblings: ReadonlyArray<{ hash: string; position: 'left' | 'right' }>;
  readonly root_hash: string;
}

// ---------------------------------------------------------------------------
// Timing-Safe Hash Comparison
// ---------------------------------------------------------------------------

/**
 * Compare two hex-encoded hashes using timing-safe comparison.
 * Prevents timing oracle attacks on hash verification.
 */
function timingSafeHashEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// Hashing Functions (RFC 6962 domain separation)
// ---------------------------------------------------------------------------

/**
 * Hash a leaf value with domain separator prefix 0x00.
 */
function hashLeaf(leafData: string): string {
  return createHash(INTEGRITY_CONFIG.HASH_ALGORITHM)
    .update(LEAF_PREFIX)
    .update(leafData)
    .digest('hex');
}

/**
 * Hash two sibling node hashes with domain separator prefix 0x01.
 * Order matters: left || right (concatenated, not sorted).
 */
function hashPair(left: string, right: string): string {
  return createHash(INTEGRITY_CONFIG.HASH_ALGORITHM)
    .update(INTERIOR_PREFIX)
    .update(left)
    .update(right)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Tree Construction
// ---------------------------------------------------------------------------

/**
 * Build a Merkle tree from an array of leaf hashes (SHA-256 hex strings).
 *
 * @param leafHashes - Array of hex-encoded SHA-256 hashes (one per corpus sample)
 * @returns MerkleTree with root hash
 * @throws Error if leafHashes is empty
 */
export function buildMerkleTree(leafHashes: readonly string[]): MerkleTree {
  if (leafHashes.length === 0) {
    throw new Error('Cannot build Merkle tree from empty leaf set');
  }

  // Validate all leaf hashes are 64-char hex
  for (const hash of leafHashes) {
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error(`Invalid leaf hash: expected 64-char hex, got '${String(hash).slice(0, 80)}'`);
    }
  }

  // Create leaf nodes with domain-separated hashing
  const leaves: MerkleNode[] = leafHashes.map(hash => ({ hash: hashLeaf(hash) }));

  // Build tree bottom-up
  const root = buildLevel(leaves);

  return {
    root,
    leaf_count: leafHashes.length,
    root_hash: root.hash,
  };
}

/**
 * Build one level of the Merkle tree by pairing nodes.
 * If odd number of nodes, the last node is promoted (not duplicated).
 */
function buildLevel(nodes: readonly MerkleNode[]): MerkleNode {
  if (nodes.length === 1) {
    return nodes[0];
  }

  const parents: MerkleNode[] = [];

  for (let i = 0; i < nodes.length; i += 2) {
    if (i + 1 < nodes.length) {
      const combined = hashPair(nodes[i].hash, nodes[i + 1].hash);
      parents.push({
        hash: combined,
        left: nodes[i],
        right: nodes[i + 1],
      });
    } else {
      // Odd node promoted — domain separation prevents leaf/interior confusion
      parents.push(nodes[i]);
    }
  }

  return buildLevel(parents);
}

// ---------------------------------------------------------------------------
// Proof Generation
// ---------------------------------------------------------------------------

/**
 * Generate a Merkle proof for a specific leaf by index.
 *
 * @param leafHashes - All leaf hashes (same order used to build tree)
 * @param leafIndex - Index of the leaf to prove
 * @returns MerkleProof containing sibling hashes needed for verification
 * @throws Error if leafIndex is out of bounds
 */
export function generateMerkleProof(
  leafHashes: readonly string[],
  leafIndex: number,
): MerkleProof {
  if (leafIndex < 0 || leafIndex >= leafHashes.length) {
    throw new Error(
      `Leaf index ${leafIndex} out of bounds [0, ${leafHashes.length - 1}]`,
    );
  }

  const tree = buildMerkleTree(leafHashes);

  // Domain-separate the leaf hashes for proof collection (same as tree construction)
  const domainSeparatedLeaves = leafHashes.map(h => hashLeaf(h));
  const siblings: Array<{ hash: string; position: 'left' | 'right' }> = [];

  collectProof(domainSeparatedLeaves, leafIndex, siblings);

  return {
    leaf_hash: domainSeparatedLeaves[leafIndex],
    leaf_index: leafIndex,
    siblings,
    root_hash: tree.root_hash,
  };
}

/**
 * Collect sibling hashes for the proof path.
 * Works level by level from leaves up to root.
 */
function collectProof(
  currentLevel: readonly string[],
  targetIndex: number,
  siblings: Array<{ hash: string; position: 'left' | 'right' }>,
): void {
  if (currentLevel.length <= 1) {
    return;
  }

  const nextLevel: string[] = [];
  const nextIndex = Math.floor(targetIndex / 2);

  for (let i = 0; i < currentLevel.length; i += 2) {
    if (i + 1 < currentLevel.length) {
      const combined = hashPair(currentLevel[i], currentLevel[i + 1]);
      nextLevel.push(combined);

      if (i === targetIndex) {
        siblings.push({ hash: currentLevel[i + 1], position: 'right' });
      } else if (i + 1 === targetIndex) {
        siblings.push({ hash: currentLevel[i], position: 'left' });
      }
    } else {
      nextLevel.push(currentLevel[i]);
    }
  }

  collectProof(nextLevel, nextIndex, siblings);
}

// ---------------------------------------------------------------------------
// Proof Verification
// ---------------------------------------------------------------------------

/**
 * Verify a Merkle proof against an expected root hash.
 * Uses timing-safe comparison to prevent oracle attacks.
 *
 * @param proof - The Merkle proof to verify
 * @returns true if the proof is valid for the given root hash
 */
export function verifyMerkleProof(proof: MerkleProof): boolean {
  let currentHash = proof.leaf_hash;

  for (const sibling of proof.siblings) {
    if (sibling.position === 'right') {
      currentHash = hashPair(currentHash, sibling.hash);
    } else {
      currentHash = hashPair(sibling.hash, currentHash);
    }
  }

  return timingSafeHashEqual(currentHash, proof.root_hash);
}

// ---------------------------------------------------------------------------
// Signed Merkle Root
// ---------------------------------------------------------------------------

/**
 * Sign a Merkle tree's root hash with HMAC.
 */
export function signMerkleRoot(tree: MerkleTree, key?: string): MerkleTree {
  const signature = signHmac(tree.root_hash, key);
  return {
    ...tree,
    hmac_signature: signature,
  };
}

/**
 * Verify a signed Merkle tree's root hash HMAC.
 */
export function verifyMerkleRoot(tree: MerkleTree, key?: string): boolean {
  if (!tree.hmac_signature) {
    return false;
  }
  return verifyHmac(tree.root_hash, tree.hmac_signature, key);
}

// ---------------------------------------------------------------------------
// Convenience: Build + Sign
// ---------------------------------------------------------------------------

/**
 * Build a Merkle tree from leaf hashes and sign the root.
 */
export function buildAndSignMerkleTree(
  leafHashes: readonly string[],
  key?: string,
): MerkleTree {
  const tree = buildMerkleTree(leafHashes);
  return signMerkleRoot(tree, key);
}

/**
 * Verify complete corpus integrity: rebuild tree from leaf hashes and
 * compare root hash against the signed tree's root + HMAC.
 * Uses timing-safe comparison for root hash matching.
 */
export function verifyCorpusIntegrity(
  leafHashes: readonly string[],
  signedTree: MerkleTree,
  key?: string,
): { root_match: boolean; hmac_valid: boolean; leaf_count_match: boolean } {
  const rebuilt = buildMerkleTree(leafHashes);

  return {
    root_match: timingSafeHashEqual(rebuilt.root_hash, signedTree.root_hash),
    hmac_valid: verifyMerkleRoot(signedTree, key),
    leaf_count_match: leafHashes.length === signedTree.leaf_count,
  };
}
